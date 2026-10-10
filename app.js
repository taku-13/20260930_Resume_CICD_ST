// 个人主页交互脚本（渐进增强：JS 失效时页面仍可阅读、锚点仍可跳转）。
// 分工原则：本文件只切换类名和文字（状态），外观全部由 styles.css 决定。
//
// 功能一览：
//   1. 返回顶部按钮（#to-top）
//   2. 滚动：阅读进度条（#reading-progress）+ 按钮滚过六成屏高才出现
//   3. 当前栏目：导航高亮 + 右下角徽标（#section-indicator）
//   4. 栏目进入视口时淡入（IntersectionObserver）

// ---------- 元素引用 ----------
// querySelector('#id') 按 id 找元素；nav a 的文字会被直接用作栏目名，
// 所以在 HTML 里新增栏目时本文件一行都不用改。
const progressBar = document.querySelector('#reading-progress')
const indicator = document.querySelector('#section-indicator')
const toTopButton = document.querySelector('#to-top')
const navLinks = document.querySelectorAll('nav a')
// 所有栏目 = hero 首屏 + 各 section（都要求带 id）
const sections = document.querySelectorAll('main .hero[id], main section[id]')
const sectionNames = new Map()
navLinks.forEach(link => {
  sectionNames.set(link.getAttribute('href'), link.textContent.trim())
})

// ---------- 1. 返回顶部 ----------
toTopButton.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
  // 顶部不属于任何栏目：同步地址栏和徽标，避免停留在旧栏目的高亮上
  history.replaceState(null, '', location.pathname)
  showCurrent('#about')
})

// ---------- 2. 滚动：进度条 + 按钮显隐 ----------
// 两件事合用一个 scroll 监听器：滚动一秒触发几十次，监听器越少越好。
function handleScroll() {
  // 阈值用屏高比例（0.6）而非写死像素，手机/电脑都合适；
  // 出现动画的样式由 CSS 的 .to-top.is-visible 决定，这里只管加/去类名。
  toTopButton.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.6)
  updateProgress()
}
window.addEventListener('scroll', handleScroll)

function updateProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  // 页面太短时 scrollable 为 0，除以 0 会得到 NaN，要先挡一下
  const ratio = scrollable > 0 ? window.scrollY / scrollable : 0
  progressBar.style.width = `${ratio * 100}%`
}

// ---------- 3. 当前栏目：导航高亮 + 右下角徽标 ----------
function showCurrent(hash) {
  // 没有 # 时默认第一个栏目，否则刚打开页面什么都不高亮
  const current = hash || '#about'

  // || '' 兜底：取不到栏目名时显示空白，绝不让页面出现 "undefined"
  indicator.textContent = sectionNames.get(current) || ''

  navLinks.forEach(link => {
    const isCurrent = link.getAttribute('href') === current
    link.classList.toggle('is-current', isCurrent)
    // aria-current 告诉读屏软件"当前在这一项"（视觉不可见，但必须做）
    if (isCurrent) link.setAttribute('aria-current', 'location')
    else link.removeAttribute('aria-current')
  })
}

// 点导航、按前进/后退键都会触发 hashchange；
// 但直接打开 index.html#skills 时 hash 没有"变化"，所以下面要再手动执行一次。
window.addEventListener('hashchange', () => showCurrent(location.hash))
showCurrent(location.hash)
// 刷新时浏览器可能已恢复滚动位置，首屏也要算一次进度条
updateProgress()

// ---------- 4a. 滚到屏幕中线才切换当前栏目 ----------
// IntersectionObserver 由浏览器底层监听，只在元素进出判定范围时通知，
// 比 scroll 事件里反复计算栏目位置省性能。
const spy = new IntersectionObserver(
  entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) showCurrent(`#${entry.target.id}`)
    }
  },
  {
    // 上下各收窄 45%：只认屏幕中间一条，避免栏目刚露头就来回乱跳
    rootMargin: '-45% 0px -45% 0px',
  },
)
sections.forEach(section => spy.observe(section))

// ---------- 4b. 栏目露出 15% 时淡入上移一次 ----------
// 加上 is-visible 后 unobserve：只淡入一次，往回滚不会重复动画。
const reveal = new IntersectionObserver(
  (entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target)
    }
  },
  { threshold: 0.15 },
)
sections.forEach(section => reveal.observe(section))
