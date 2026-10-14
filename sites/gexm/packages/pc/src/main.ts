import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from '@/router'
import App from '@/App.vue'
import { useUserStore } from '@/store/user'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const userStore = useUserStore()
userStore.initFromStorage()

app.use(router)
app.use(ElementPlus)

app.mount('#app')
