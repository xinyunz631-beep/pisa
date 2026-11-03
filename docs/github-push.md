# 推送到 GitHub：等待协作者权限

## 当前状态

| 项目 | 值 |
| --- | --- |
| 目标仓库（公开） | https://github.com/xinyunz631-beep/pisa |
| 远程地址 | `git@github.com:xinyunz631-beep/pisa.git` |
| 本地分支 | `main`，首个提交 `a9f549c` |
| 本机 SSH 密钥 | `~/.ssh/id_ed25519`（无口令） |
| 公钥指纹 | `SHA256:wPBkh9jE7wbZ2hnOQCFkcamYhQP0SZsPTX7AjSzCHyo` |

目前阻塞点：`xinyunz631-beep` 账号不归我们控制，本机公钥加不进去，因此 `git push` 会返回
`Permission denied (publickey)`。

## 需要仓库所有者做的一步

把本项目的 GitHub 账号加为 **Collaborator（写权限）**：

1. 仓库 → **Settings** → **Collaborators** → **Add people**
2. 输入对方 GitHub 用户名，权限选 **Write**
3. 对方在邮件 / GitHub 通知里接受邀请

## 需要本机账号做的一步

接受邀请后，把下面这行公钥加到**自己的** GitHub 账号：
https://github.com/settings/keys → New SSH key → Key type 选 **Authentication key**

```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL1JnCKbgFef4rw/5ozeKfMzo4rBGXU19dy2un9fYKSt lumingvi-bisas@local
```

## 授权完成后

```bash
cd 比萨斯
ssh -T git@github.com          # 应显示 Hi <username>! You've successfully authenticated...
git push -u origin main
```

推送成功后：

- 远端 `main` 会包含本地全部提交
- 后续提交直接 `git push` 即可（SSH 免密）

## 备注

- 仓库是**公开**的，含原型代码；如不希望公开，先让所有者改为 Private。
- 若后续改用 HTTPS + Personal Access Token 方式，执行
  `git remote set-url origin https://github.com/xinyunz631-beep/pisa.git` 即可。
