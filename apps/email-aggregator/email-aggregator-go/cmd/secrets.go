package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"email-aggregator-go/src/security"
)

// newCredentialVault 基于环境构造信封加密保险库（ADR-004 运行期落地）。
//
// 凭据本身走信封加密（一次性 DEK 加密明文，数据 KEK 包裹 DEK）后存入 CredentialsRef，
// 明文仅在进程内存短暂存在、零落盘。数据 KEK 由 LocalKms 持有，其密钥库文件已用 REK
// （密钥库加密密钥）AES-GCM 加密落盘——KEK 不再明文落盘（详见 local_kms.go）。
//
// 优先级：
//   KMS_KEYRING_FILE  → 持久化多版本本地 KMS（密钥库加密落盘）；REK 来源：
//                       KMS_KEYRING_PASSPHRASE（口令 PBKDF2，可跨机）>
//                       KMS_KEYRING_KEYFILE（32 字节原始密钥文件）>
//                       默认自动生成 <file>.mkey 机器密钥（0600，gitignore）。
//   KMS_KEYRING       → 单 KEK 内存本地 KMS（不落盘，进程退出即丢）。
//   皆空              → 随机内存 KMS（演示，重启即丢，已告警）。
//
// 生产建议：设 KMS_KEYRING_FILE 并至少提供 KMS_KEYRING_PASSPHRASE 或 KMS_KEYRING_KEYFILE。
// 真正机密是 REK，而非数据 KEK；换口令/机器密钥只需 RekeyRing 重封密钥库，无需轮换已封存凭据。
func newCredentialVault() *security.CredentialVault {
	if f := os.Getenv("KMS_KEYRING_FILE"); f != "" {
		if k, err := security.NewLocalKmsFromFile(f); err == nil {
			return security.NewCredentialVault(k)
		}
	}
	if k := os.Getenv("KMS_KEYRING"); k != "" {
		return security.NewCredentialVault(security.NewLocalKmsWithKey(k))
	}
	return security.NewCredentialVault(security.NewLocalKmsInMemory())
}

// resolveSecret 解析敏感凭据，打通 ADR-004 的运行期落地：
//   - 若值为信封加密 JSON（以 "{" 开头且含 kekId 字段），用保险库拆封；
//   - 否则当作明文（向后兼容 PoC 形态）。
//
// 返回运行时明文，供下游适配器（OpenSearch / MinIO 等）建立连接使用。
// 静态配置/环境变量中可只保留信封，明文仅在进程内存中短暂存在、零落盘。
func resolveSecret(ctx context.Context, vault *security.CredentialVault, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if !strings.HasPrefix(raw, "{") {
		return raw, nil
	}
	var env security.Envelope
	if err := json.Unmarshal([]byte(raw), &env); err != nil {
		return "", fmt.Errorf("secret 不是合法信封: %w", err)
	}
	pt, err := vault.Unseal(ctx, env)
	if err != nil {
		return "", fmt.Errorf("secret 拆封失败: %w", err)
	}
	return string(pt), nil
}
