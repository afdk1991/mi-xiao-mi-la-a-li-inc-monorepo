# API文档

## 1. 认证API

### 1.1 用户登录
- **端点**: `POST /auth/login`
- **描述**: 用户登录获取访问令牌
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | email | string | 是 | 用户邮箱 |
  | password | string | 是 | 用户密码 |

- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "登录成功",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "csrf_token": "abc123def456",
    "user": {
      "id": 1,
      "name": "用户名",
      "email": "user@example.com",
      "avatar": "https://example.com/avatar.jpg",
      "role": "user",
      "created_at": "2023-01-01T00:00:00Z"
    }
  }
  ```

### 1.2 用户注册
- **端点**: `POST /auth/register`
- **描述**: 新用户注册
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | name | string | 是 | 用户名 |
  | email | string | 是 | 用户邮箱 |
  | password | string | 是 | 用户密码 |
  | password_confirmation | string | 是 | 密码确认 |

- **响应示例**:
  ```json
  {
    "code": 201,
    "message": "注册成功",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "csrf_token": "abc123def456",
    "user": {
      "id": 2,
      "name": "新用户",
      "email": "newuser@example.com",
      "avatar": "https://example.com/default-avatar.jpg",
      "role": "user",
      "created_at": "2023-01-02T00:00:00Z"
    }
  }
  ```

### 1.3 用户登出
- **端点**: `POST /auth/logout`
- **描述**: 用户登出，使令牌失效
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "登出成功"
  }
  ```

### 1.4 获取当前用户信息
- **端点**: `GET /auth/me`
- **描述**: 获取当前登录用户的详细信息
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "user": {
      "id": 1,
      "name": "用户名",
      "email": "user@example.com",
      "avatar": "https://example.com/avatar.jpg",
      "role": "user",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-02T00:00:00Z"
    }
  }
  ```

### 1.5 更新用户资料
- **端点**: `PUT /auth/profile` 或 `PUT /user/profile`
- **描述**: 更新当前用户的个人资料
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | name | string | 否 | 用户名 |
  | bio | string | 否 | 用户简介 |
  | website | string | 否 | 个人网站 |
  | location | string | 否 | 所在地 |

- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "资料更新成功",
    "user": {
      "id": 1,
      "name": "新用户名",
      "email": "user@example.com",
      "bio": "这是我的简介",
      "website": "https://example.com",
      "location": "北京",
      "avatar": "https://example.com/avatar.jpg",
      "role": "user",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-03T00:00:00Z"
    }
  }
  ```

### 1.6 更新密码
- **端点**: `PUT /auth/password` 或 `PUT /user/change-password`
- **描述**: 更新当前用户的密码
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | current_password | string | 是 | 当前密码 |
  | new_password | string | 是 | 新密码 |
  | new_password_confirmation | string | 是 | 新密码确认 |

- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "密码更新成功"
  }
  ```

### 1.7 上传头像
- **端点**: `POST /auth/avatar` 或 `POST /user/avatar`
- **描述**: 上传用户头像
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | file | file | 是 | 头像文件 |

- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "头像上传成功",
    "avatar": "https://example.com/new-avatar.jpg"
  }
  ```

### 1.8 刷新令牌
- **端点**: `POST /auth/refresh` 或 `POST /auth/refresh-token`
- **描述**: 使用刷新令牌获取新的访问令牌
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | refresh_token | string | 是 | 刷新令牌 |

- **响应示例**:
  ```json
  {
    "code": 200,
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "csrf_token": "abc123def456"
  }
  ```

### 1.9 忘记密码
- **端点**: `POST /auth/forgot-password`
- **描述**: 发送密码重置邮件
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | email | string | 是 | 用户邮箱 |

- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "密码重置邮件已发送"
  }
  ```

### 1.10 重置密码
- **端点**: `POST /auth/reset-password`
- **描述**: 使用重置令牌重置密码
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | token | string | 是 | 密码重置令牌 |
  | email | string | 是 | 用户邮箱 |
  | password | string | 是 | 新密码 |
  | password_confirmation | string | 是 | 新密码确认 |

- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "密码重置成功"
  }
  ```

### 1.11 验证邮箱
- **端点**: `POST /auth/verify-email`
- **描述**: 验证用户邮箱
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | token | string | 是 | 邮箱验证令牌 |

- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "邮箱验证成功"
  }
  ```

### 1.12 重新发送验证邮件
- **端点**: `POST /auth/resend-verification-email`
- **描述**: 重新发送邮箱验证邮件
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | email | string | 是 | 用户邮箱 |

- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "验证邮件已重新发送"
  }
  ```

## 2. 文章API

### 2.1 获取文章列表
- **端点**: `GET /articles`
- **描述**: 获取文章列表，支持分页和筛选
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | page | number | 否 | 页码，默认1 |
  | limit | number | 否 | 每页数量，默认10 |
  | category | string | 否 | 分类ID或slug |
  | tag | string | 否 | 标签名称 |
  | status | string | 否 | 文章状态（published, draft, pending） |
  | author | number | 否 | 作者ID |

- **响应示例**:
  ```json
  {
    "code": 200,
    "articles": [
      {
        "id": 1,
        "title": "文章标题",
        "slug": "article-slug",
        "excerpt": "文章摘要",
        "content": "文章内容",
        "status": "published",
        "view_count": 100,
        "like_count": 10,
        "comment_count": 5,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-02T00:00:00Z",
        "author": {
          "id": 1,
          "name": "作者名",
          "avatar": "https://example.com/avatar.jpg"
        },
        "category": {
          "id": 1,
          "name": "分类名",
          "slug": "category-slug"
        },
        "tags": [
          { "id": 1, "name": "标签1" },
          { "id": 2, "name": "标签2" }
        ]
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "total_pages": 10
    }
  }
  ```

### 2.2 获取单个文章
- **端点**: `GET /articles/:id` 或 `GET /articles/slug/:slug`
- **描述**: 通过ID或slug获取单个文章的详细信息
- **请求参数**: 无
- **响应示例**: 同文章列表中的单篇文章

### 2.3 创建文章
- **端点**: `POST /articles`
- **描述**: 创建新文章
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | title | string | 是 | 文章标题 |
  | content | string | 是 | 文章内容 |
  | excerpt | string | 否 | 文章摘要 |
  | slug | string | 否 | 文章slug，自动生成 |
  | status | string | 否 | 文章状态（published, draft, pending），默认draft |
  | category_id | number | 否 | 分类ID |
  | tag_ids | number[] | 否 | 标签ID数组 |
  | featured_image | string | 否 | 特色图片URL |

- **响应示例**: 同单个文章响应

### 2.4 更新文章
- **端点**: `PUT /articles/:id`
- **描述**: 更新现有文章
- **请求参数**: 同创建文章
- **响应示例**: 同单个文章响应

### 2.5 删除文章
- **端点**: `DELETE /articles/:id`
- **描述**: 删除文章
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "文章删除成功"
  }
  ```

### 2.6 点赞/取消点赞文章
- **端点**: `POST /articles/:id/like` 或 `DELETE /articles/:id/like`
- **描述**: 点赞或取消点赞文章
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "点赞成功",
    "like_count": 11
  }
  ```

### 2.7 获取文章评论
- **端点**: `GET /articles/:articleId/comments`
- **描述**: 获取文章的评论列表
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | page | number | 否 | 页码，默认1 |
  | limit | number | 否 | 每页数量，默认10 |

- **响应示例**:
  ```json
  {
    "code": 200,
    "comments": [
      {
        "id": 1,
        "content": "评论内容",
        "like_count": 5,
        "created_at": "2023-01-01T00:00:00Z",
        "author": {
          "id": 1,
          "name": "评论者",
          "avatar": "https://example.com/avatar.jpg"
        }
      }
    ],
    "pagination": {
      "total": 20,
      "page": 1,
      "limit": 10,
      "total_pages": 2
    }
  }
  ```

### 2.8 创建文章评论
- **端点**: `POST /articles/:articleId/comments`
- **描述**: 为文章创建新评论
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | content | string | 是 | 评论内容 |
  | parent_id | number | 否 | 父评论ID，用于回复 |

- **响应示例**:
  ```json
  {
    "code": 201,
    "message": "评论创建成功",
    "comment": {
      "id": 2,
      "content": "新评论",
      "like_count": 0,
      "created_at": "2023-01-03T00:00:00Z",
      "author": {
        "id": 1,
        "name": "评论者",
        "avatar": "https://example.com/avatar.jpg"
      }
    }
  }
  ```

### 2.9 获取热门文章
- **端点**: `GET /articles/popular`
- **描述**: 获取热门文章列表
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | limit | number | 否 | 返回数量，默认10 |

- **响应示例**: 同文章列表，但只包含热门文章

### 2.10 获取最新文章
- **端点**: `GET /articles/latest`
- **描述**: 获取最新发布的文章列表
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | limit | number | 否 | 返回数量，默认10 |

- **响应示例**: 同文章列表，但只包含最新文章

### 2.11 获取相关文章
- **端点**: `GET /articles/:articleId/related`
- **描述**: 获取与指定文章相关的文章列表
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | limit | number | 否 | 返回数量，默认5 |

- **响应示例**: 同文章列表，但只包含相关文章

### 2.12 搜索文章
- **端点**: `GET /articles/search`
- **描述**: 根据关键词搜索文章
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | q | string | 是 | 搜索关键词 |
  | page | number | 否 | 页码，默认1 |
  | limit | number | 否 | 每页数量，默认10 |

- **响应示例**: 同文章列表，但只包含搜索结果

### 2.13 更新文章状态
- **端点**: `PATCH /articles/:id/status`
- **描述**: 更新文章状态
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | status | string | 是 | 新状态（published, draft, pending） |

- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "状态更新成功",
    "article": {
      "id": 1,
      "status": "published",
      "title": "文章标题",
      "slug": "article-slug"
    }
  }
  ```

### 2.14 获取文章统计
- **端点**: `GET /articles/stats`
- **描述**: 获取文章相关统计数据
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "stats": {
      "total_articles": 100,
      "published_articles": 80,
      "draft_articles": 20,
      "total_views": 10000,
      "total_comments": 500,
      "total_likes": 1000
    }
  }
  ```

### 2.15 获取分类列表
- **端点**: `GET /categories`
- **描述**: 获取所有文章分类
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "categories": [
      {
        "id": 1,
        "name": "分类1",
        "slug": "category-1",
        "article_count": 50
      },
      {
        "id": 2,
        "name": "分类2",
        "slug": "category-2",
        "article_count": 30
      }
    ]
  }
  ```

### 2.16 获取标签列表
- **端点**: `GET /tags`
- **描述**: 获取所有文章标签
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "tags": ["标签1", "标签2", "标签3"]
  }
  ```

## 3. 论坛API

### 3.1 获取论坛板块列表
- **端点**: `GET /boards`
- **描述**: 获取论坛板块列表
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | page | number | 否 | 页码，默认1 |
  | limit | number | 否 | 每页数量，默认10 |

- **响应示例**:
  ```json
  {
    "code": 200,
    "boards": [
      {
        "id": 1,
        "name": "板块名称",
        "slug": "board-slug",
        "description": "板块描述",
        "topic_count": 100,
        "post_count": 500,
        "last_post": {
          "id": 100,
          "title": "最新帖子",
          "created_at": "2023-01-01T00:00:00Z",
          "author": {
            "id": 1,
            "name": "作者名"
          }
        }
      }
    ],
    "pagination": {
      "total": 10,
      "page": 1,
      "limit": 10,
      "total_pages": 1
    }
  }
  ```

### 3.2 获取板块树状结构
- **端点**: `GET /boards/tree`
- **描述**: 获取论坛板块的树状结构
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "boards": [
      {
        "id": 1,
        "name": "父板块",
        "slug": "parent-board",
        "children": [
          {
            "id": 2,
            "name": "子板块1",
            "slug": "child-board-1"
          },
          {
            "id": 3,
            "name": "子板块2",
            "slug": "child-board-2"
          }
        ]
      }
    ]
  }
  ```

### 3.3 获取单个板块
- **端点**: `GET /boards/:slug`
- **描述**: 获取单个论坛板块的详细信息
- **请求参数**: 无
- **响应示例**: 同板块列表中的单个板块

### 3.4 创建板块
- **端点**: `POST /boards`
- **描述**: 创建新的论坛板块
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | name | string | 是 | 板块名称 |
  | slug | string | 否 | 板块slug，自动生成 |
  | description | string | 否 | 板块描述 |
  | parent_id | number | 否 | 父板块ID |
  | order | number | 否 | 排序顺序 |

- **响应示例**: 同单个板块响应

### 3.5 更新板块
- **端点**: `PUT /boards/:id`
- **描述**: 更新现有论坛板块
- **请求参数**: 同创建板块
- **响应示例**: 同单个板块响应

### 3.6 删除板块
- **端点**: `DELETE /boards/:id`
- **描述**: 删除论坛板块
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "板块删除成功"
  }
  ```

### 3.7 更新板块顺序
- **端点**: `POST /boards/update-order`
- **描述**: 更新板块的排序顺序
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | boards | array | 是 | 板块ID和顺序的数组 |

- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "板块顺序更新成功"
  }
  ```

### 3.8 获取话题列表
- **端点**: `GET /topics`
- **描述**: 获取论坛话题列表
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | board_id | number | 否 | 板块ID |
  | page | number | 否 | 页码，默认1 |
  | limit | number | 否 | 每页数量，默认10 |
  | status | string | 否 | 话题状态（open, closed, sticky, announcement） |
  | author | number | 否 | 作者ID |

- **响应示例**:
  ```json
  {
    "code": 200,
    "topics": [
      {
        "id": 1,
        "title": "话题标题",
        "slug": "topic-slug",
        "content": "话题内容",
        "view_count": 100,
        "reply_count": 10,
        "status": "open",
        "is_sticky": false,
        "is_announcement": false,
        "is_locked": false,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-02T00:00:00Z",
        "last_reply": {
          "id": 10,
          "content": "最后回复内容",
          "created_at": "2023-01-02T00:00:00Z",
          "author": {
            "id": 2,
            "name": "回复者"
          }
        },
        "author": {
          "id": 1,
          "name": "作者名",
          "avatar": "https://example.com/avatar.jpg"
        },
        "board": {
          "id": 1,
          "name": "板块名",
          "slug": "board-slug"
        }
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "total_pages": 10
    }
  }
  ```

### 3.9 获取单个话题
- **端点**: `GET /topics/:slug`
- **描述**: 通过slug获取单个话题的详细信息
- **请求参数**: 无
- **响应示例**: 同话题列表中的单个话题

### 3.10 创建话题
- **端点**: `POST /topics`
- **描述**: 创建新话题
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | title | string | 是 | 话题标题 |
  | content | string | 是 | 话题内容 |
  | board_id | number | 是 | 板块ID |
  | tags | string[] | 否 | 话题标签 |

- **响应示例**: 同单个话题响应

### 3.11 更新话题
- **端点**: `PUT /topics/:id`
- **描述**: 更新现有话题
- **请求参数**: 同创建话题
- **响应示例**: 同单个话题响应

### 3.12 删除话题
- **端点**: `DELETE /topics/:id`
- **描述**: 删除话题
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "话题删除成功"
  }
  ```

### 3.13 切换话题置顶状态
- **端点**: `POST /topics/:id/toggle-sticky`
- **描述**: 切换话题的置顶状态
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "置顶状态已更新",
    "is_sticky": true
  }
  ```

### 3.14 切换话题公告状态
- **端点**: `POST /topics/:id/toggle-announcement`
- **描述**: 切换话题的公告状态
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "公告状态已更新",
    "is_announcement": true
  }
  ```

### 3.15 切换话题锁定状态
- **端点**: `POST /topics/:id/toggle-lock`
- **描述**: 切换话题的锁定状态
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "锁定状态已更新",
    "is_locked": true
  }
  ```

### 3.16 获取话题评论
- **端点**: `GET /comments/topic/:topicId`
- **描述**: 获取话题的评论列表
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | page | number | 否 | 页码，默认1 |
  | limit | number | 否 | 每页数量，默认10 |

- **响应示例**: 同文章评论响应

### 3.17 创建评论
- **端点**: `POST /comments`
- **描述**: 创建评论（文章或话题）
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | content | string | 是 | 评论内容 |
  | parent_id | number | 否 | 父评论ID，用于回复 |
  | article_id | number | 否 | 文章ID（二选一） |
  | topic_id | number | 否 | 话题ID（二选一） |

- **响应示例**: 同文章评论响应

### 3.18 更新评论
- **端点**: `PUT /comments/:id`
- **描述**: 更新现有评论
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | content | string | 是 | 新评论内容 |

- **响应示例**: 同文章评论响应

### 3.19 删除评论
- **端点**: `DELETE /comments/:id`
- **描述**: 删除评论
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "评论删除成功"
  }
  ```

### 3.20 点赞评论
- **端点**: `POST /comments/:id/like`
- **描述**: 点赞评论
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "点赞成功",
    "like_count": 6
  }
  ```

## 4. 用户API

### 4.1 获取用户列表（管理员）
- **端点**: `GET /admin/users`
- **描述**: 获取所有用户列表（管理员权限）
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | page | number | 否 | 页码，默认1 |
  | limit | number | 否 | 每页数量，默认10 |
  | role | string | 否 | 用户角色 |
  | status | string | 否 | 用户状态（active, inactive, banned） |

- **响应示例**:
  ```json
  {
    "code": 200,
    "users": [
      {
        "id": 1,
        "name": "用户名",
        "email": "user@example.com",
        "avatar": "https://example.com/avatar.jpg",
        "role": "user",
        "status": "active",
        "created_at": "2023-01-01T00:00:00Z",
        "last_login": "2023-01-02T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "total_pages": 10
    }
  }
  ```

### 4.2 获取单个用户
- **端点**: `GET /users/:userId`
- **描述**: 获取单个用户的详细信息
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "user": {
      "id": 1,
      "name": "用户名",
      "email": "user@example.com",
      "bio": "用户简介",
      "website": "https://example.com",
      "location": "北京",
      "avatar": "https://example.com/avatar.jpg",
      "role": "user",
      "status": "active",
      "created_at": "2023-01-01T00:00:00Z",
      "last_login": "2023-01-02T00:00:00Z",
      "stats": {
        "articles": 10,
        "comments": 50,
        "likes": 100,
        "followers": 20,
        "following": 30
      }
    }
  }
  ```

### 4.3 关注/取消关注用户
- **端点**: `POST /users/:userId/follow` 或 `DELETE /users/:userId/follow`
- **描述**: 关注或取消关注用户
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "关注成功",
    "followers_count": 21
  }
  ```

### 4.4 获取用户关注列表
- **端点**: `GET /users/:userId/following`
- **描述**: 获取用户关注的用户列表
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | page | number | 否 | 页码，默认1 |
  | limit | number | 否 | 每页数量，默认10 |

- **响应示例**: 同用户列表，但只包含关注的用户

### 4.5 获取用户粉丝列表
- **端点**: `GET /users/:userId/followers`
- **描述**: 获取用户的粉丝列表
- **请求参数**:
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | page | number | 否 | 页码，默认1 |
  | limit | number | 否 | 每页数量，默认10 |

- **响应示例**: 同用户列表，但只包含粉丝用户

## 5. 通用API设计

### 5.1 响应格式
所有API响应都遵循统一的格式：

```json
{
  "code": 200, // HTTP状态码
  "message": "成功消息", // 可选的消息
  "data": {} // 响应数据，根据端点不同而变化
}
```

### 5.2 错误处理
错误响应格式：

```json
{
  "code": 400, // HTTP错误码
  "message": "错误消息", // 错误描述
  "errors": { // 可选的验证错误详情
    "field1": ["错误信息1", "错误信息2"],
    "field2": ["错误信息1"]
  }
}
```

### 5.3 认证和授权
- 使用Bearer Token进行认证，在请求头中添加：`Authorization: Bearer <token>`
- 使用CSRF令牌防止跨站请求伪造，在请求头中添加：`X-CSRF-TOKEN: <csrf_token>`
- 令牌有效期：访问令牌1天，刷新令牌7天

### 5.4 速率限制
- API请求速率限制为每分钟100次
- 超过限制会返回429状态码

### 5.5 缓存
- GET请求结果缓存10分钟
- 内容更新时自动清除相关缓存

### 5.6 分页
分页响应格式：

```json
{
  "code": 200,
  "items": [], // 数据列表
  "pagination": {
    "total": 100, // 总记录数
    "page": 1, // 当前页码
    "limit": 10, // 每页数量
    "total_pages": 10 // 总页数
  }
}
```

## 6. API版本控制
当前API版本为v1，通过URL前缀 `/api` 访问。未来版本将通过URL前缀 `/api/v2` 等方式进行版本控制。

## 7. 开发环境
- 开发环境API地址：`http://localhost:8001/api`
- 生产环境API地址：`https://laal.top/api`

## 8. 安全注意事项
1. 所有API请求必须使用HTTPS
2. 敏感数据（如密码）必须通过HTTPS传输
3. 令牌必须妥善保管，避免泄露
4. 定期更换密码和令牌
5. 遵循最小权限原则，只授予必要的API访问权限

## 9. 监控和日志
- API请求和响应会被记录到日志中
- 异常情况会触发告警
- 定期生成API使用报告

## 10. 支持和反馈
如有API相关问题或建议，请联系开发团队：
- 邮箱：dev@laal.top
- 文档：https://laal.top/api-docs
- 更新日志：https://laal.top/api-changelog

## 11. 更新日志

### v1.0.0 (2023-01-01)
- 初始版本发布
- 实现认证API
- 实现文章API
- 实现论坛API
- 实现用户API

### v1.1.0 (2023-02-01)
- 新增文章搜索功能
- 新增话题公告功能
- 优化API响应速度
- 增强API安全性

### v1.2.0 (2023-03-01)
- 新增用户关注功能
- 新增评论点赞功能
- 新增文章统计功能
- 优化分页性能

---

**文档更新时间**: 2023-03-01
**文档版本**: v1.2.0