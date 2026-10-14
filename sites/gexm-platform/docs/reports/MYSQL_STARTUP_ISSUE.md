# MySQL服务启动问题及解决方案

## 问题描述
在启动WordPress服务时，遇到了数据库连接错误：
- 错误信息：`由于目标计算机积极拒绝，无法连接。`
- WordPress错误页面：`Error establishing a database connection`

## 问题原因
1. MySQL服务当前处于停止状态
2. 尝试使用`net start MySQL`命令启动服务时遇到权限问题：
   ```
   发生系统错误 5。
   拒绝访问。
   ```

## 解决方案

### 1. 使用管理员权限启动MySQL服务

#### Windows方法：
1. 右键点击「开始」菜单
2. 选择「Windows PowerShell (管理员)」
3. 在管理员PowerShell中运行：
   ```powershell
   net start MySQL
   ```

#### 或使用服务管理控制台：
1. 按下 `Win + R` 键
2. 输入 `services.msc` 并按回车
3. 在服务列表中找到「MySQL」
4. 右键点击并选择「启动」

### 2. 验证MySQL服务状态

启动成功后，可以使用以下命令验证服务状态：
```powershell
Get-Service -Name MySQL
```

预期输出：
```
Status   Name               DisplayName
------   ----               -----------
Running  MySQL              MySQL
```

### 3. 重新测试WordPress服务

MySQL服务启动成功后，刷新WordPress页面：
- WordPress：http://localhost:8080

## 注意事项

1. **开发环境配置**：当前配置适合开发环境使用，生产环境建议使用完整的Web服务器配置
2. **数据库连接**：WordPress配置文件已正确设置，数据库连接信息位于`config/.env`
3. **端口设置**：
   - WordPress：8080
   - 前端：5173
   - 后端API：3000
4. **PHP内置服务器**：仅适合开发环境，生产环境建议使用Nginx或Apache

## 当前服务状态

| 服务类型 | 状态 | 访问地址 | 备注 |
|---------|------|---------|------|
| WordPress | 已启动，等待数据库连接 | http://localhost:8080 | 需MySQL服务支持 |
| 前端 | 已启动，运行正常 | http://localhost:5173 | 开发服务器 |
| 后端API | 已启动，运行正常 | http://localhost:3000 | 健康检查：http://localhost:3000/health |
| MySQL | 已停止 | - | 需管理员权限启动 |

## 下一步操作

1. 按照上述步骤启动MySQL服务
2. 验证WordPress服务是否正常访问
3. 如仍有问题，检查数据库连接配置
4. 生产环境部署时，建议使用Docker或完整的服务器配置