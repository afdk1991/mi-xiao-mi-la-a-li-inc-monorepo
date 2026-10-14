<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { reviewApi, type Review } from '@/api'
import { ElTable, ElTableColumn, ElButton, ElInput, ElSelect, ElDrawer, ElForm, ElFormItem, ElMessage, ElDialog, ElRate } from 'element-plus'

const reviews = ref<Review[]>([])
const searchKeyword = ref('')
const statusFilter = ref('')
const drawerVisible = ref(false)
const replyDrawerVisible = ref(false)
const dialogVisible = ref(false)
const selectedReview = ref<Review | null>(null)
const replyContent = ref('')
const deleteIds = ref<string[]>([])
const selectAll = ref(false)

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'active', label: '显示' },
  { value: 'hidden', label: '隐藏' },
  { value: 'deleted', label: '已删除' },
]

async function fetchReviews() {
  try {
    const query: { page: number; pageSize: number; keyword?: string; status?: string } = { page: 1, pageSize: 100 }
    if (searchKeyword.value) query.keyword = searchKeyword.value
    if (statusFilter.value) query.status = statusFilter.value
    const result = await reviewApi.getReviews(query)
    reviews.value = result.list || []
    deleteIds.value = []
    selectAll.value = false
  } catch (e) {
    console.error('Failed to fetch reviews:', e)
  }
}

function handleSearch() {
  fetchReviews()
}

function openDetail(review: Review) {
  selectedReview.value = review
  drawerVisible.value = true
}

function openReply(review: Review) {
  selectedReview.value = review
  replyContent.value = review.reply || ''
  replyDrawerVisible.value = true
}

async function handleReply() {
  if (!selectedReview.value || !replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  try {
    await reviewApi.replyReview(selectedReview.value.id, { reply: replyContent.value.trim() })
    ElMessage.success('回复成功')
    replyDrawerVisible.value = false
    fetchReviews()
  } catch (e: any) {
    ElMessage.error(e?.message || '回复失败')
  }
}

async function handleStatusChange(id: string, status: string) {
  try {
    await reviewApi.updateReviewStatus(id, { status })
    ElMessage.success('更新成功')
    fetchReviews()
  } catch (e: any) {
    ElMessage.error(e?.message || '更新失败')
  }
}

function toggleSelect(id: string) {
  const index = deleteIds.value.indexOf(id)
  if (index > -1) {
    deleteIds.value.splice(index, 1)
  } else {
    deleteIds.value.push(id)
  }
  selectAll.value = reviews.value.length > 0 && deleteIds.value.length === reviews.value.length
}

function toggleSelectAll() {
  if (selectAll.value) {
    deleteIds.value = reviews.value.map((r) => r.id)
  } else {
    deleteIds.value = []
  }
}

async function batchDelete() {
  if (deleteIds.value.length === 0) {
    ElMessage.warning('请选择要删除的评论')
    return
  }
  dialogVisible.value = true
}

async function confirmBatchDelete() {
  try {
    await reviewApi.batchDeleteReviews(deleteIds.value)
    ElMessage.success('批量删除成功')
    dialogVisible.value = false
    fetchReviews()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

function formatStatus(status: string) {
  const statusMap: Record<string, string> = {
    active: '显示',
    hidden: '隐藏',
    deleted: '已删除',
  }
  return statusMap[status] || status
}

onMounted(() => {
  fetchReviews()
})
</script>

<template>
  <div class="gexm-page">
    <div class="page-header">
      <h2>评论管理</h2>
      <div class="header-actions">
        <ElInput v-model="searchKeyword" placeholder="搜索评论内容" style="width: 250px" @keyup.enter="handleSearch" />
        <ElSelect v-model="statusFilter" placeholder="状态" style="width: 120px; margin-left: 10px">
          <ElSelect.Option v-for="opt in statusOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
        </ElSelect>
        <ElButton type="danger" style="margin-left: 10px" @click="batchDelete" :disabled="deleteIds.length === 0">批量删除</ElButton>
      </div>
    </div>

    <ElTable :data="reviews" border style="width: 100%">
      <ElTableColumn type="selection" width="50" @select="toggleSelect" @select-all="toggleSelectAll" />
      <ElTableColumn prop="id" label="ID" width="80" />
      <ElTableColumn prop="productId" label="商品ID" width="100" />
      <ElTableColumn prop="userId" label="用户ID" width="100" />
      <ElTableColumn prop="rating" label="评分" width="80">
        <template #default="scope">
          <ElRate :model-value="scope.row.rating" disabled allow-half />
        </template>
      </ElTableColumn>
      <ElTableColumn prop="content" label="评论内容" minWidth="300">
        <template #default="scope">
          <span :title="scope.row.content">{{ scope.row.content?.length > 50 ? scope.row.content.slice(0, 50) + '...' : scope.row.content }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="status" label="状态" width="100">
        <template #default="scope">
          <span>{{ formatStatus(scope.row.status) }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="reply" label="商家回复" width="200">
        <template #default="scope">
          <span v-if="scope.row.reply" :title="scope.row.reply">{{ scope.row.reply.length > 30 ? scope.row.reply.slice(0, 30) + '...' : scope.row.reply }}</span>
          <span v-else class="text-gray">未回复</span>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="createdAt" label="评论时间" width="180" />
      <ElTableColumn label="操作" width="200" fixed="right">
        <template #default="scope">
          <ElButton size="small" @click="openDetail(scope.row)">详情</ElButton>
          <ElButton size="small" @click="openReply(scope.row)">回复</ElButton>
          <ElButton size="small" type="danger" @click="handleStatusChange(scope.row.id, 'deleted')">删除</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>

    <ElDrawer title="评论详情" v-model="drawerVisible" size="600px">
      <div v-if="selectedReview" class="review-detail">
        <div class="detail-row">
          <span class="label">商品ID:</span>
          <span>{{ selectedReview.productId }}</span>
        </div>
        <div class="detail-row">
          <span class="label">用户ID:</span>
          <span>{{ selectedReview.userId }}</span>
        </div>
        <div class="detail-row">
          <span class="label">评分:</span>
          <ElRate :model-value="selectedReview.rating" disabled />
        </div>
        <div class="detail-row">
          <span class="label">状态:</span>
          <span>{{ formatStatus(selectedReview.status) }}</span>
        </div>
        <div class="detail-section">
          <h4>评论内容</h4>
          <p>{{ selectedReview.content }}</p>
        </div>
        <div v-if="selectedReview.images && selectedReview.images.length" class="detail-section">
          <h4>图片</h4>
          <div class="image-grid">
            <img v-for="(img, idx) in selectedReview.images" :key="idx" :src="img" class="review-image" />
          </div>
        </div>
        <div v-if="selectedReview.reply" class="detail-section">
          <h4>商家回复</h4>
          <p>{{ selectedReview.reply }}</p>
        </div>
      </div>
    </ElDrawer>

    <ElDrawer title="回复评论" v-model="replyDrawerVisible" size="500px">
      <ElForm label-width="80px">
        <ElFormItem label="回复内容">
          <ElInput type="textarea" v-model="replyContent" :rows="5" placeholder="请输入回复内容" />
        </ElFormItem>
        <div style="margin-top: 20px; text-align: right">
          <ElButton @click="replyDrawerVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleReply" style="margin-left: 10px">发送</ElButton>
        </div>
      </ElForm>
    </ElDrawer>

    <ElDialog title="确认批量删除" v-model="dialogVisible" width="400px">
      <p>确定要删除选中的 {{ deleteIds.length }} 条评论吗？此操作不可恢复。</p>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="danger" @click="confirmBatchDelete">确定删除</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.text-gray {
  color: #999;
}

.review-detail {
  padding: 10px;
}

.detail-row {
  display: flex;
  margin-bottom: 12px;
}

.label {
  width: 80px;
  font-weight: bold;
  color: #666;
}

.detail-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.detail-section h4 {
  margin-bottom: 10px;
  color: #333;
}

.detail-section p {
  color: #666;
  line-height: 1.6;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.review-image {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
}
</style>