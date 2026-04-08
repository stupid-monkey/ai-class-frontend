// import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
// 👇 新增这三行，引入 Element Plus 和它的样式 👇
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import i18n from './locales/index'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(ElementPlus)
app.mount('#app')
