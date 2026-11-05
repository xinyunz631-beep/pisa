# 推送到 GitHub：已接入完成

## 当前状态（已完成）

| 项目 | 值 |
| --- | --- |
| 远程仓库（公开） | https://github.com/xinyunz631-beep/pisa |
| 远程地址 | `git@github.com:xinyunz631-beep/pisa.git` |
| 默认分支 | `main` |
| 首次推送 | `main -> main`，已跟踪 `origin/main` |
| 登录账号 | SSH 密钥认证（`ssh -T git@github.com` 通过） |

## 日常使用

```bash
cd 比萨斯
git status            # 看改动
git add -A
git commit -m "feat: xxx"
git push              # 已设置 upstream，直接 push 即可
```

## 验证

```bash
git ls-remote origin           # 远端 refs 应与本地 HEAD 一致
ssh -T git@github.com          # 应显示 Hi <username>! You've successfully authenticated
```

## 备注

- 仓库为**公开**仓库，含前端原型代码与 `docs/api/` 接口契约文档；如不希望公开，请在 GitHub 设置中改为 Private。
- 本机密钥：`~/.ssh/id_ed25519`（无口令），公钥已添加到 GitHub 账号。
- 若换机器/重装系统，重新生成密钥并把公钥加到 GitHub 即可继续推送。
