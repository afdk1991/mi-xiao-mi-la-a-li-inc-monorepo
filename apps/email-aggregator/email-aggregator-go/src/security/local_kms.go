package security

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"sync"
)

// ---- 密钥库加密密钥（REK）相关环境变量 ----
//   KMS_KEYRING_PASSPHRASE：用口令派生 REK（PBKDF2-HMAC-SHA256，可跨机迁移）
//   KMS_KEYRING_KEYFILE ：直接提供 32 字节原始 REK 文件（最灵活）
//   二者皆空时：在密钥库同目录自动生成 <keyring>.mkey 机器密钥并落盘（0600）。
// 真正机密是 REK，而非数据 KEK；因此"换口令/换机器密钥"只需 RekeyRing 重封密钥库，
// 已封存的凭据信封无需重封——这就是"不轮换"策略的落点。
const (
	envKeyringPassphrase = "KMS_KEYRING_PASSPHRASE"
	envKeyringKeyFile    = "KMS_KEYRING_KEYFILE"
	pbkdf2Iterations     = 200000
)

// LocalKeyring 持久化密钥库内层结构（多数据 KEK 版本，JSON）。
type LocalKeyring struct {
	Active string            `json:"active"`
	KEKs   map[string]string `json:"keks"` // id -> base64(KEK)
}

// KeyringEnvelope 密钥库外层加密信封（落盘形态，绝不暴露明文 KEK）。
// Ciphertext = AES-GCM(REK, json(LocalKeyring))，nonce 内置于 Ciphertext 前缀。
type KeyringEnvelope struct {
	V          int    `json:"v"`
	KDF        string `json:"kdf"`        // pbkdf2-hmac-sha256 | raw-keyfile | machine-key | ephemeral
	Salt       string `json:"salt"`       // base64(PBKDF2 salt)，其它 KDF 为空
	Iterations int    `json:"iterations"` // PBKDF2 迭代次数
	Ciphertext string `json:"ciphertext"` // base64(AES-GCM(REK, 内层))
}

// LocalKms 本地真实密钥管理服务：数据 KEK 可持久化并支持多版本（兼容历史信封解密）。
// 密钥库文件本身用 REK（口令/机器密钥派生）AES-GCM 加密落盘——KEK 不再明文落盘。
// 仅依赖标准库，适用于无云 KMS / Vault 的离线等价场景（ADR-004 运行期落地）。
type LocalKms struct {
	mu        sync.Mutex
	keks      map[string][]byte
	activeID  string
	file      string // 持久化路径，空则不落盘（仅内存）
	rek       []byte // 密钥库加密密钥（REK）；文件模式必需
	kdf       string
	salt      []byte
	ephemeral bool // true=REK 为进程内随机，重启即丢（仅演示，已显式告警）
}

// NewLocalKmsInMemory 仅内存 KMS（随机 KEK，进程退出即丢，演示/单测用）。
func NewLocalKmsInMemory() *LocalKms {
	k := &LocalKms{keks: map[string][]byte{}}
	k.addKEK()
	return k
}

// NewLocalKmsWithKey 用外部主密钥串构造单 KEK 本地 KMS（兼容旧语义，不落盘）。
// 空串回退随机内存 KEK（公开仓库绝不内置固定 KEK）。
func NewLocalKmsWithKey(key string) *LocalKms {
	if key == "" {
		return NewLocalKmsInMemory()
	}
	sum := sha256.Sum256([]byte(key))
	return &LocalKms{keks: map[string][]byte{"kek-1": sum[:]}, activeID: "kek-1"}
}

// NewLocalKmsFromFile 从密钥库文件构造；不存在则生成初始数据 KEK 并创建（加密）文件。
// 密钥库文件用 REK 加密；REK 来源见 resolveREK。支持多数据 KEK 版本与旧明文密钥库迁移。
func NewLocalKmsFromFile(path string) (*LocalKms, error) {
	k := &LocalKms{keks: map[string][]byte{}, file: path}
	data, err := os.ReadFile(path)
	if err == nil {
		var env KeyringEnvelope
		if jerr := json.Unmarshal(data, &env); jerr == nil && env.KDF != "" {
			// 新格式：加密信封
			rek, _, _, _, rerr := resolveREK(path, &env)
			if rerr != nil {
				return nil, rerr
			}
			ct, derr := base64.StdEncoding.DecodeString(env.Ciphertext)
			if derr != nil {
				return nil, fmt.Errorf("local_kms: decode ciphertext: %w", derr)
			}
			inner, oerr := aesGCMOpen(rek, ct)
			if oerr != nil {
				return nil, fmt.Errorf("local_kms: open keyring %s (REK 不匹配?): %w", path, oerr)
			}
			var ring LocalKeyring
			if err := json.Unmarshal(inner, &ring); err != nil {
				return nil, fmt.Errorf("local_kms: parse inner keyring %s: %w", path, err)
			}
			if merr := loadRing(k, ring); merr != nil {
				return nil, merr
			}
			k.rek = rek
			k.kdf = env.KDF
			if env.Salt != "" {
				if s, derr := base64.StdEncoding.DecodeString(env.Salt); derr == nil {
					k.salt = s
				}
			}
		} else {
			// 旧格式：明文密钥库（演进前）。迁移为加密信封（REK 取默认机器密钥）。
			var ring LocalKeyring
			if err := json.Unmarshal(data, &ring); err != nil {
				return nil, fmt.Errorf("local_kms: parse legacy keyring %s: %w", path, err)
			}
			if merr := loadRing(k, ring); merr != nil {
				return nil, merr
			}
			rek, kdf, salt, ephemeral, rerr := resolveREK(path, nil)
			if rerr != nil {
				return nil, rerr
			}
			k.rek, k.kdf, k.salt, k.ephemeral = rek, kdf, salt, ephemeral
			if perr := k.persist(); perr != nil {
				return nil, fmt.Errorf("local_kms: migrate legacy keyring: %w", perr)
			}
		}
	} else {
		rek, kdf, salt, ephemeral, rerr := resolveREK(path, nil)
		if rerr != nil {
			return nil, rerr
		}
		k.rek, k.kdf, k.salt, k.ephemeral = rek, kdf, salt, ephemeral
		k.addKEK()
		if perr := k.persist(); perr != nil {
			return nil, rerwrap(perr)
		}
	}
	if k.activeID == "" {
		k.activeID = "kek-1"
	}
	if k.ephemeral {
		fmt.Fprintf(os.Stderr, "[WARN] local_kms: 使用进程内随机 REK（重启即失效，已封存货封无法跨重启解密）；生产请设置 %s 或 %s\n", envKeyringPassphrase, envKeyringKeyFile)
	}
	return k, nil
}

// rerwrap 复用错误包装，避免重复字面量。
func rerwrap(err error) error { return fmt.Errorf("local_kms: persist: %w", err) }

// loadRing 把内层 LocalKeyring 载入内存（解码各 KEK）。
func loadRing(k *LocalKms, ring LocalKeyring) error {
	for id, b64 := range ring.KEKs {
		raw, derr := base64.StdEncoding.DecodeString(b64)
		if derr != nil {
			return fmt.Errorf("local_kms: decode kek %s: %w", id, derr)
		}
		k.keks[id] = raw
	}
	k.activeID = ring.Active
	return nil
}

// resolveREK 解析密钥库加密密钥（REK）。existing 非 nil 表示加载已有密钥库，据其 KDF 派生；
// existing 为 nil 表示新建，按环境变量决定 KDF。返回 (rek, kdf, salt, ephemeral, err)。
//
// 优先级（新建时）：KMS_KEYRING_KEYFILE（原始 32 字节）> KMS_KEYRING_PASSPHRASE（口令 PBKDF2）>
// 默认自动生成机器密钥 <keyring>.mkey。加载时则严格按已有 KDF 反查所需口令/密钥文件，缺失即失败（fail-closed）。
func resolveREK(keyringPath string, existing *KeyringEnvelope) (rek []byte, kdf string, salt []byte, ephemeral bool, err error) {
	if existing != nil {
		switch existing.KDF {
		case "pbkdf2-hmac-sha256":
			p := os.Getenv(envKeyringPassphrase)
			if p == "" {
				return nil, "", nil, false, fmt.Errorf("local_kms: 密钥库 %s 使用口令 KDF，必须设置 %s", keyringPath, envKeyringPassphrase)
			}
			iters := existing.Iterations
			if iters <= 0 {
				iters = pbkdf2Iterations
			}
			s, derr := base64.StdEncoding.DecodeString(existing.Salt)
			if derr != nil {
				return nil, "", nil, false, fmt.Errorf("local_kms: decode salt: %w", derr)
			}
			return pbkdf2HMACSHA256([]byte(p), s, iters, 32), existing.KDF, s, false, nil
		case "raw-keyfile":
			f := os.Getenv(envKeyringKeyFile)
			if f == "" {
				return nil, "", nil, false, fmt.Errorf("local_kms: 密钥库 %s 使用密钥文件 KDF，必须设置 %s", keyringPath, envKeyringKeyFile)
			}
			raw, rerr := os.ReadFile(f)
			if rerr != nil {
				return nil, "", nil, false, fmt.Errorf("local_kms: 读取密钥文件 %s: %w", f, rerr)
			}
			if len(raw) != 32 {
				return nil, "", nil, false, fmt.Errorf("local_kms: 密钥文件 %s 需 32 字节，实际 %d", f, len(raw))
			}
			return raw, "raw-keyfile", nil, false, nil
		case "machine-key":
			mkeyPath := keyringPath + ".mkey"
			raw, rerr := os.ReadFile(mkeyPath)
			if rerr != nil {
				return nil, "", nil, false, fmt.Errorf("local_kms: 机器密钥 %s 缺失（密钥库依赖它）: %w", mkeyPath, rerr)
			}
			if len(raw) != 32 {
				return nil, "", nil, false, fmt.Errorf("local_kms: 机器密钥 %s 需 32 字节，实际 %d", mkeyPath, len(raw))
			}
			return raw, "machine-key", nil, false, nil
		default:
			return nil, "", nil, false, fmt.Errorf("local_kms: 未知 KDF %q", existing.KDF)
		}
	}
	// 新建：keyfile > passphrase > 机器密钥
	if f := os.Getenv(envKeyringKeyFile); f != "" {
		raw, rerr := os.ReadFile(f)
		if rerr != nil {
			return nil, "", nil, false, fmt.Errorf("local_kms: 读取密钥文件 %s: %w", f, rerr)
		}
		if len(raw) != 32 {
			return nil, "", nil, false, fmt.Errorf("local_kms: 密钥文件 %s 需 32 字节，实际 %d", f, len(raw))
		}
		return raw, "raw-keyfile", nil, false, nil
	}
	if p := os.Getenv(envKeyringPassphrase); p != "" {
		s := make([]byte, 16)
		if _, rerr := io.ReadFull(rand.Reader, s); rerr != nil {
			return nil, "", nil, false, rerr
		}
		return pbkdf2HMACSHA256([]byte(p), s, pbkdf2Iterations, 32), "pbkdf2-hmac-sha256", s, false, nil
	}
	// 默认：机器密钥文件（同目录 <keyring>.mkey，可写则落盘，否则回退进程内随机 REK）
	mkeyPath := keyringPath + ".mkey"
	mk := make([]byte, 32)
	if _, rerr := io.ReadFull(rand.Reader, mk); rerr != nil {
		return nil, "", nil, false, rerr
	}
	if werr := os.WriteFile(mkeyPath, mk, 0o600); werr != nil {
		ek := make([]byte, 32)
		_, _ = io.ReadFull(rand.Reader, ek)
		return ek, "ephemeral", nil, true, nil
	}
	return mk, "machine-key", nil, false, nil
}

func (k *LocalKms) addKEK() string {
	kek := make([]byte, 32)
	_, _ = io.ReadFull(rand.Reader, kek)
	id := fmt.Sprintf("kek-%d", len(k.keks)+1)
	k.keks[id] = kek
	k.activeID = id
	return id
}

// persist 将内层密钥库用 REK 加密后写盘（仅 file 非空时）。
func (k *LocalKms) persist() error {
	if k.file == "" {
		return nil
	}
	ring := LocalKeyring{Active: k.activeID, KEKs: map[string]string{}}
	for id, raw := range k.keks {
		ring.KEKs[id] = base64.StdEncoding.EncodeToString(raw)
	}
	inner, err := json.MarshalIndent(ring, "", "  ")
	if err != nil {
		return err
	}
	ct := aesGCMSeal(k.rek, inner)
	env := KeyringEnvelope{
		V:          1,
		KDF:        k.kdf,
		Salt:       base64.StdEncoding.EncodeToString(k.salt),
		Iterations: pbkdf2Iterations,
		Ciphertext: base64.StdEncoding.EncodeToString(ct),
	}
	data, err := json.MarshalIndent(env, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(k.file, data, 0o600)
}

// RekeyRing 仅更换 REK（口令/机器密钥），不动数据 KEK，因此已封存货封无需重封。
// 这是"不轮换"策略的核心：真正机密是 REK；换口令只需重封密钥库，无需轮换凭据数据。
func (k *LocalKms) RekeyRing(newREK []byte, newKDF string, newSalt []byte) error {
	if k.file == "" {
		return errors.New("local_kms: 内存模式不支持 RekeyRing（请使用 KMS_KEYRING_FILE）")
	}
	k.mu.Lock()
	defer k.mu.Unlock()
	k.rek, k.kdf, k.salt = newREK, newKDF, newSalt
	return k.persist()
}

// ActiveKEKID 返回当前 active 数据 KEK 标识（供信封准确记录，便于审计/轮换追踪）。
func (k *LocalKms) ActiveKEKID(_ context.Context) string {
	k.mu.Lock()
	defer k.mu.Unlock()
	return k.activeID
}

// Encrypt 数据 KEK 包裹（用当前 active 数据 KEK，AES-GCM，nonce 前缀于输出）。
func (k *LocalKms) Encrypt(_ context.Context, plaintext []byte) ([]byte, error) {
	k.mu.Lock()
	kek, ok := k.keks[k.activeID]
	k.mu.Unlock()
	if !ok {
		return nil, errors.New("local_kms: active kek missing")
	}
	return aesGCMSeal(kek, plaintext)
}

// Decrypt 数据 KEK 解包：遍历所有历史数据 KEK 尝试（兼容轮换前的历史信封）。
func (k *LocalKms) Decrypt(_ context.Context, blob []byte) ([]byte, error) {
	k.mu.Lock()
	keks := make([][]byte, 0, len(k.keks))
	for _, raw := range k.keks {
		keks = append(keks, raw)
	}
	k.mu.Unlock()
	var lastErr error
	for _, kek := range keks {
		if pt, err := aesGCMOpen(kek, blob); err == nil {
			return pt, nil
		} else {
			lastErr = err
		}
	}
	if lastErr == nil {
		lastErr = errors.New("local_kms: no kek available")
	}
	return nil, lastErr
}

// RotateKEK 真实轮换：生成新数据 KEK 设为 active 并持久化；返回新数据 KEK 标识。
func (k *LocalKms) RotateKEK(_ context.Context) (string, error) {
	k.mu.Lock()
	defer k.mu.Unlock()
	id := k.addKEK()
	if err := k.persist(); err != nil {
		return "", err
	}
	return id, nil
}

// aesGCMSeal AES-GCM 加密，nonce 前置到输出（标准库封装）。
func aesGCMSeal(kek, plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(kek)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	iv := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return nil, err
	}
	return gcm.Seal(iv, iv, plaintext, nil), nil
}

// aesGCMOpen AES-GCM 解密，nonce 从输入前置段取出。
func aesGCMOpen(kek, blob []byte) ([]byte, error) {
	block, err := aes.NewCipher(kek)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	ns := gcm.NonceSize()
	if len(blob) < ns {
		return nil, errors.New("ciphertext too short")
	}
	return gcm.Open(nil, blob[:ns], blob[ns:], nil)
}

// pbkdf2HMACSHA256 标准库实现的 PBKDF2（HMAC-SHA256），避免引入外部依赖。
func pbkdf2HMACSHA256(password, salt []byte, iter, keyLen int) []byte {
	prf := func(key, data []byte) []byte {
		h := hmac.New(sha256.New, key)
		h.Write(data)
		return h.Sum(nil)
	}
	hLen := sha256.Size
	blocks := (keyLen + hLen - 1) / hLen
	out := make([]byte, 0, blocks*hLen)
	for i := 1; i <= blocks; i++ {
		ib := []byte{byte(i >> 24), byte(i >> 16), byte(i >> 8), byte(i)}
		u := prf(password, append(append([]byte{}, salt...), ib...))
		t := append([]byte{}, u...)
		for j := 2; j <= iter; j++ {
			u = prf(password, u)
			for idx := range t {
				t[idx] ^= u[idx]
			}
		}
		out = append(out, t...)
	}
	return out[:keyLen]
}
