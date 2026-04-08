import { createI18n } from 'vue-i18n'
import en from './en'
import zh from './zh'

const messages = { en, zh }

// Get browser default language or fallback to 'en'
const defaultLocale = localStorage.getItem('app_locale') || 'en'

const i18n = createI18n({
  legacy: false, // use Composition API
  locale: defaultLocale,
  fallbackLocale: 'en',
  messages
})

export default i18n
