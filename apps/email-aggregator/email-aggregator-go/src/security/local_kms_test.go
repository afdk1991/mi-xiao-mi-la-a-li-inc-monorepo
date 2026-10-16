package security

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestLocalKms_SealUnseal(t *testing.T) {
	k := NewLocalKmsInMemory()
	pt := []byte("super-secret-credential")
	blob, err := k.Encrypt(context.Background(), pt)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	if string(blob) == string(pt) {
		t.Fatal("ciphertext must not equal plaintext")
	}
	got, err := k.Decrypt(context.Background(), blob)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}
	if string(got) != string(pt) {
		t.Fatalf("roundtrip mismatch: got %q", got)
	}
}

// TestLocalKms_RotateKeepsOldEnvelopes 验证：轮换后，用旧 KEK 加密的历史信封仍能拆封。
func TestLocalKms_RotateKeepsOldEnvelopes(t *testing.T) {
	k := NewLocalKmsInMemory()
	oldBlob, err := k.Encrypt(context.Background(), []byte("legacy-secret"))
	if err != nil {
		t.Fatalf("encrypt old: %v", err)
	}

	// 多轮轮换，模拟活跃 KEK 已更换多次。
	for i := 0; i < 3; i++ {
		if _, err := k.RotateKEK(context.Background()); err != nil {
			t.Fatalf("rotate: %v", err)
		}
	}

	// 历史信封仍可用（Decrypt 遍历所有 KEK）。
	got, err := k.Decrypt(context.Background(), oldBlob)
	if err != nil {
		t.Fatalf("decrypt legacy after rotate: %v", err)
	}
	if string(got) != "legacy-secret" {
		t.Fatalf("legacy mismatch: %q", got)
	}
}

// TestLocalKms_FilePersistence 验证：密钥库落盘后，新进程（重新加载）仍可解密历史信封。
func TestLocalKms_FilePersistence(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "keyring.json")

	k1, err := NewLocalKmsFromFile(path)
	if err != nil {
		t.Fatalf("new from file (create): %v", err)
	}
	sealed, err := k1.Encrypt(context.Background(), []byte("persisted-secret"))
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	// 轮换并再加密一条，模拟长期运行。
	if _, err := k1.RotateKEK(context.Background()); err != nil {
		t.Fatalf("rotate: %v", err)
	}

	// 重新从文件加载（模拟重启），旧信封必须仍可解密。
	k2, err := NewLocalKmsFromFile(path)
	if err != nil {
		t.Fatalf("new from file (reload): %v", err)
	}
	got, err := k2.Decrypt(context.Background(), sealed)
	if err != nil {
		t.Fatalf("decrypt after reload: %v", err)
	}
	if string(got) != "persisted-secret" {
		t.Fatalf("persisted mismatch: %q", got)
	}

	// 文件权限应受限（0600）。Windows 不强制 Unix 权限位，跳过该断言以避免
	// 跨平台误报；生产环境（Linux）仍由 os.WriteFile(..., 0o600) 真正生效。
	if runtime.GOOS != "windows" {
		fi, err := os.Stat(path)
		if err != nil {
			t.Fatalf("stat: %v", err)
		}
		if fi.Mode().Perm() != 0o600 {
			t.Fatalf("keyring perm = %v, want 0600", fi.Mode().Perm())
		}
	}
}

// TestLocalKms_WithCredentialVault 端到端：替代 InMemoryKms 接入 CredentialVault。
func TestLocalKms_WithCredentialVault(t *testing.T) {
	v := NewCredentialVault(NewLocalKmsInMemory())
	env, err := v.Seal(context.Background(), []byte("db-password"))
	if err != nil {
		t.Fatalf("seal: %v", err)
	}
	pt, err := v.Unseal(context.Background(), env)
	if err != nil {
		t.Fatalf("unseal: %v", err)
	}
	if string(pt) != "db-password" {
		t.Fatalf("vault roundtrip mismatch: %q", pt)
	}
	// 轮换后，历史信封仍可拆封（Decrypt 遍历历史 KEK）。
	if _, err := v.Rotate(context.Background(), env); err != nil {
		t.Fatalf("rotate: %v", err)
	}
}

// TestLocalKms_PassphraseKDF 口令派生 REK：同名口令可跨进程重载；错误口令必须失败。
func TestLocalKms_PassphraseKDF(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "keyring.json")
	t.Setenv(envKeyringPassphrase, "correct horse battery staple")

	k1, err := NewLocalKmsFromFile(path)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := k1.RotateKEK(context.Background()); err != nil {
		t.Fatalf("rotate: %v", err)
	}
	sealed, err := k1.Encrypt(context.Background(), []byte("vault-secret"))
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}

	// 用相同口令重载（模拟重启）。
	t.Setenv(envKeyringPassphrase, "correct horse battery staple")
	k2, err := NewLocalKmsFromFile(path)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	got, err := k2.Decrypt(context.Background(), sealed)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}
	if string(got) != "vault-secret" {
		t.Fatalf("mismatch: %q", got)
	}

	// 错误口令必须失败（REK 不匹配）。
	t.Setenv(envKeyringPassphrase, "wrong-pass")
	if _, err := NewLocalKmsFromFile(path); err == nil {
		t.Fatal("expected load failure with wrong passphrase")
	}
}

// TestLocalKms_RekeyRing 更换 REK（口令变更）后旧信封仍可解密，无需数据 KEK 轮换。
// 这正是"不轮换"策略的落点：真正机密是 REK，换口令只重封密钥库。
func TestLocalKms_RekeyRing(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "keyring.json")
	t.Setenv(envKeyringPassphrase, "old-pass")

	k, err := NewLocalKmsFromFile(path)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	sealed, err := k.Encrypt(context.Background(), []byte("secret"))
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}

	// 更换 REK 为新口令派生（salt 一并更新）。
	newSalt := []byte("newsalt")
	newREK := pbkdf2HMACSHA256([]byte("new-pass"), newSalt, pbkdf2Iterations, 32)
	if err := k.RekeyRing(newREK, "pbkdf2-hmac-sha256", newSalt); err != nil {
		t.Fatalf("rekey: %v", err)
	}
	// 旧信封仍可用（数据 KEK 未变）。
	got, err := k.Decrypt(context.Background(), sealed)
	if err != nil {
		t.Fatalf("decrypt after rekey: %v", err)
	}
	if string(got) != "secret" {
		t.Fatalf("mismatch: %q", got)
	}
	// 用新口令派生 REK 应可重载。
	t.Setenv(envKeyringPassphrase, "new-pass")
	k2, err := NewLocalKmsFromFile(path)
	if err != nil {
		t.Fatalf("reload new: %v", err)
	}
	got2, err := k2.Decrypt(context.Background(), sealed)
	if err != nil {
		t.Fatalf("decrypt reload: %v", err)
	}
	if string(got2) != "secret" {
		t.Fatalf("mismatch2: %q", got2)
	}
}
