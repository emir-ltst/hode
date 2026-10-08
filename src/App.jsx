import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { localeTags, translate } from './translations'
import './App.css'

const LanguageContext = createContext({ t: (key) => key, locale: 'en' })
const useLanguage = () => useContext(LanguageContext)
const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const shiftDate = (value, amount) => {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + amount)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const dateLabel = (value, options = { weekday: 'long', month: 'long', day: 'numeric' }, locale = 'en') => {
  const date = new Date(`${value}T12:00:00`)
  if (locale === 'ky') {
    const months = options.month === 'short'
      ? ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
      : ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
    const month = months[date.getMonth()]
    const weekday = options.weekday ? weekdayLabel(date, locale, options.weekday) : ''
    const day = options.day ? `${date.getDate()}-` : ''
    const year = options.year ? ` ${date.getFullYear()}-ж.` : ''
    if (weekday && day) return `${weekday}, ${day}${month}${year}`
    if (day) return `${day}${month}${year}`
    if (options.month && options.year) return `${month} ${date.getFullYear()}-ж.`
    return weekday || String(date.getDate())
  }
  return date.toLocaleDateString(localeTags[locale] || localeTags.en, options)
}
const weekdayLabel = (value, locale, style = 'short') => {
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00`)
  if (locale === 'ky') {
    const long = ['жекшемби', 'дүйшөмбү', 'шейшемби', 'шаршемби', 'бейшемби', 'жума', 'ишемби']
    const short = ['жш', 'дш', 'шш', 'шр', 'бш', 'жм', 'иш']
    const narrow = ['Ж', 'Д', 'Ш', 'Ш', 'Б', 'Ж', 'И']
    return (style === 'long' ? long : style === 'narrow' ? narrow : short)[date.getDay()]
  }
  return date.toLocaleDateString(localeTags[locale] || localeTags.en, { weekday: style })
}
const monthYearLabel = (date, locale) => locale === 'ky'
  ? `${['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'][date.getMonth()]} ${date.getFullYear()}-ж.`
  : date.toLocaleDateString(localeTags[locale] || localeTags.en, { month: 'long', year: 'numeric' })
const timeLabel = (value, locale) => {
  const date = value instanceof Date
    ? value
    : /^\d{2}:\d{2}$/.test(value)
      ? new Date(`2000-01-01T${value}`)
      : new Date(value)
  if (locale === 'ky') return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return date.toLocaleTimeString(localeTags[locale] || localeTags.en, { hour: 'numeric', minute: '2-digit' })
}
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const sections = [
  ['dashboard', '⌂'],
  ['diary', '▤'],
  ['planner', '◷'],
  ['calendar', '▦'],
  ['habits', '↻'],
  ['progress', '◒'],
]
const markerColors = ['yellow', 'green', 'blue', 'pink', 'purple']
const selectableItems = () => [...document.querySelectorAll('[data-selectable="true"]')].filter((item) => item.getClientRects().length > 0)
const initialData = () => ({
  tasks: [
    { id: id(), date: today(), title: 'A slow morning & a good coffee', sampleKey: 'sampleMorningTask', time: '08:30', priority: 'Medium', completed: true, marker: '' },
    { id: id(), date: today(), title: 'Make space for a little reading', sampleKey: 'sampleReadingTask', time: '10:00', priority: 'Low', completed: false, marker: '' },
    { id: id(), date: today(), title: 'Focus time — big project', sampleKey: 'sampleFocusTask', time: '14:00', priority: 'High', completed: false, marker: 'yellow' },
    { id: id(), date: today(), title: 'Evening walk, no headphones', sampleKey: 'sampleWalkTask', time: '18:30', priority: 'Low', completed: false, marker: '' },
  ],
  entries: [],
  habits: [
    { id: id(), name: 'Read for 20 minutes', sampleKey: 'sampleReadHabit', history: {} },
    { id: id(), name: 'Move my body', sampleKey: 'sampleMoveHabit', history: {} },
    { id: id(), name: 'Drink enough water', sampleKey: 'sampleWaterHabit', history: {} },
    { id: id(), name: 'Write a little', sampleKey: 'sampleWriteHabit', history: {} },
  ],
  theme: 'dark',
  keyboardOpen: false,
  language: 'en',
})

function loadData() {
  const saved = localStorage.getItem('daylight-planner')
  if (!saved) return initialData()
  try {
    const parsed = JSON.parse(saved)
    const taskSamples = {
      'A slow morning & a good coffee': 'sampleMorningTask',
      'Make space for a little reading': 'sampleReadingTask',
      'Focus time — big project': 'sampleFocusTask',
      'Evening walk, no headphones': 'sampleWalkTask',
    }
    const habitSamples = {
      'Read for 20 minutes': 'sampleReadHabit',
      'Move my body': 'sampleMoveHabit',
      'Drink enough water': 'sampleWaterHabit',
      'Write a little': 'sampleWriteHabit',
    }
    return {
      ...initialData(),
      ...parsed,
      tasks: (parsed.tasks || initialData().tasks).map((task) => ({ ...task, sampleKey: task.sampleKey || taskSamples[task.title] })),
      habits: (parsed.habits || initialData().habits).map((habit) => ({ ...habit, sampleKey: habit.sampleKey || habitSamples[habit.name] })),
      language: ['en', 'ru', 'ky'].includes(parsed.language) ? parsed.language : 'en',
    }
  } catch {
    return initialData()
  }
}

function App() {
  const [data, setData] = useState(loadData)
  const locale = data.language || 'en'
  const t = useCallback((key, values) => translate(locale, key, values), [locale])
  const [view, setView] = useState('dashboard')
  const [selectedDate, setSelectedDate] = useState(today())
  const [modal, setModal] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [taskFilter, setTaskFilter] = useState('All')
  const [taskDraft, setTaskDraft] = useState({ title: '', time: '09:00', priority: 'Medium', marker: '' })
  const [entryDraft, setEntryDraft] = useState('')
  const [habitDraft, setHabitDraft] = useState('')
  const [selectedItem, setSelectedItem] = useState(-1)
  const [shift, setShift] = useState(false)
  const [caps, setCaps] = useState(false)
  const [virtualControl, setVirtualControl] = useState(false)
  const [virtualAlt, setVirtualAlt] = useState(false)
  const [currentHour] = useState(() => new Date().getHours())
  const titleInput = useRef(null)
  const entryInput = useRef(null)

  useEffect(() => {
    localStorage.setItem('daylight-planner', JSON.stringify(data))
    document.documentElement.dataset.theme = data.theme
    document.documentElement.lang = localeTags[locale]
    document.title = `daylight. — ${translate(locale, 'planner')}`
  }, [data, locale])

  const localizedTasks = useMemo(() => data.tasks.map((task) => task.sampleKey ? { ...task, title: translate(locale, task.sampleKey) } : task), [data.tasks, locale])
  const localizedHabits = useMemo(() => data.habits.map((habit) => habit.sampleKey ? { ...habit, name: translate(locale, habit.sampleKey) } : habit), [data.habits, locale])
  const tasks = useMemo(() => localizedTasks.filter((task) => task.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)), [localizedTasks, selectedDate])
  const entries = useMemo(() => data.entries.filter((entry) => entry.date === selectedDate), [data.entries, selectedDate])
  const completedTasks = tasks.filter((task) => task.completed).length
  const taskPercent = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0
  const completedHabits = data.habits.filter((habit) => habit.history[selectedDate]).length
  const habitPercent = data.habits.length ? Math.round((completedHabits / data.habits.length) * 100) : 0
  const overallPercent = Math.round((taskPercent + habitPercent) / 2)
  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === 'Completed') return task.completed
    if (taskFilter === 'To do') return !task.completed
    return true
  })

  const updateData = useCallback((updater) => setData((current) => typeof updater === 'function' ? updater(current) : { ...current, ...updater }), [])
  const navigateDate = useCallback((amount) => setSelectedDate((date) => shiftDate(date, amount)), [])
  const openNewTask = useCallback(() => {
    setTaskDraft({ title: '', time: '09:00', priority: 'Medium', marker: '' })
    setModal({ type: 'task' })
    setTimeout(() => titleInput.current?.focus(), 30)
  }, [])
  const openNewEntry = useCallback(() => {
    setEntryDraft('')
    setModal({ type: 'entry' })
    setTimeout(() => entryInput.current?.focus(), 30)
  }, [])
  const saveTask = useCallback((event) => {
    event?.preventDefault()
    if (!taskDraft.title.trim()) return
    const editing = modal?.type === 'task' && modal.taskId
    updateData((current) => ({
      ...current,
      tasks: editing
        ? current.tasks.map((task) => task.id === modal.taskId ? { ...task, ...taskDraft, title: taskDraft.title.trim(), sampleKey: task.sampleKey && taskDraft.title.trim() === t(task.sampleKey) ? task.sampleKey : undefined } : task)
        : [...current.tasks, { ...taskDraft, id: id(), date: selectedDate, completed: false, title: taskDraft.title.trim() }],
    }))
    setModal(null)
  }, [modal, taskDraft, selectedDate, updateData, t])
  const editTask = (task) => {
    setTaskDraft({ title: task.sampleKey ? t(task.sampleKey) : task.title, time: task.time, priority: task.priority, marker: task.marker || '' })
    setModal({ type: 'task', taskId: task.id })
  }
  const saveEntry = useCallback((event) => {
    event?.preventDefault()
    if (!entryDraft.trim()) return
    if (modal?.entryId) {
      updateData((current) => ({ ...current, entries: current.entries.map((entry) => entry.id === modal.entryId ? { ...entry, text: entryDraft.trim(), updatedAt: new Date().toISOString() } : entry) }))
    } else {
      updateData((current) => ({ ...current, entries: [{ id: id(), date: selectedDate, text: entryDraft.trim(), createdAt: new Date().toISOString(), marker: '' }, ...current.entries] }))
    }
    setModal(null)
  }, [entryDraft, modal, selectedDate, updateData])
  const editEntry = (entry) => {
    setEntryDraft(entry.text)
    setModal({ type: 'entry', entryId: entry.id })
  }
  const toggleTask = useCallback((taskId) => updateData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task) })), [updateData])
  const removeTask = useCallback((taskId) => {
    if (!window.confirm(t('deleteTaskConfirm'))) return
    updateData((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== taskId) }))
  }, [updateData, t])
  const removeEntry = (entryId) => {
    if (!window.confirm(t('deleteEntryConfirm'))) return
    updateData((current) => ({ ...current, entries: current.entries.filter((entry) => entry.id !== entryId) }))
  }
  const addHabit = (event) => {
    event.preventDefault()
    if (!habitDraft.trim()) return
    updateData((current) => ({ ...current, habits: [...current.habits, { id: id(), name: habitDraft.trim(), history: {} }] }))
    setHabitDraft('')
  }
  const toggleHabit = useCallback((habitId) => updateData((current) => ({
    ...current,
    habits: current.habits.map((habit) => habit.id === habitId ? { ...habit, history: { ...habit.history, [selectedDate]: !habit.history[selectedDate] } } : habit),
  })), [selectedDate, updateData])
  const removeHabit = (habitId) => {
    if (!window.confirm(t('deleteHabitConfirm'))) return
    updateData((current) => ({ ...current, habits: current.habits.filter((habit) => habit.id !== habitId) }))
  }
  const toggleMarker = (type, itemId, color) => updateData((current) => ({
    ...current,
    [type]: current[type].map((item) => item.id === itemId ? { ...item, marker: item.marker === color ? '' : color } : item),
  }))
  const showView = useCallback((name) => {
    setView(name)
    setSearchOpen(false)
    setModal(null)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target
      const typing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      if (event.key === 'Escape') {
        if (modal) setModal(null)
        else if (searchOpen) setSearchOpen(false)
        else if (data.keyboardOpen) updateData((current) => ({ ...current, keyboardOpen: false }))
        else if (view === 'shortcuts') setView('dashboard')
        return
      }
      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase()
        if (key === 'enter') {
          if (modal?.type === 'entry') saveEntry()
          else if (modal?.type === 'task') saveTask()
          event.preventDefault()
          return
        }
        if (key === 'k') { event.preventDefault(); setSearchOpen(true); setTimeout(() => document.querySelector('.search-overlay input')?.focus(), 30); return }
        if (key === 'n') { event.preventDefault(); openNewTask(); return }
        if (key === 'h') { event.preventDefault(); showView('habits'); return }
        if (key === 'd') { event.preventDefault(); showView('diary'); return }
        if (key === 'p') { event.preventDefault(); showView('planner'); return }
        if (key === 'c') { event.preventDefault(); showView('calendar'); return }
        if (key === '/' || event.code === 'Slash') { event.preventDefault(); setView('shortcuts'); return }
      }
      if (typing) return
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const items = selectableItems()
        if (items.length) {
          event.preventDefault()
          const direction = event.key === 'ArrowDown' ? 1 : -1
          const focused = target instanceof HTMLElement ? target.closest('[data-selectable="true"]') : null
          const currentIndex = [...items].indexOf(focused)
          const base = currentIndex >= 0 ? currentIndex : selectedItem
          const next = base < 0 ? (direction > 0 ? 0 : items.length - 1) : (base + direction + items.length) % items.length
          setSelectedItem(next)
          items[next].focus()
        }
      }
      if (event.code === 'Space') {
        const item = target instanceof HTMLElement ? target.closest('[data-selectable="true"]') : null
        if (item?.dataset.toggleId) { event.preventDefault(); toggleTask(item.dataset.toggleId) }
        else if (item?.dataset.habitId) { event.preventDefault(); toggleHabit(item.dataset.habitId) }
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedItem >= 0) {
        const item = target instanceof HTMLElement ? target.closest('[data-selectable="true"]') : null
        if (item?.dataset.deleteId) removeTask(item.dataset.deleteId)
      }
      if (event.key === 'Enter' && target instanceof HTMLElement && target.dataset.action) target.click()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modal, searchOpen, view, data.keyboardOpen, selectedItem, taskDraft, entryDraft, saveEntry, saveTask, toggleHabit, toggleTask, removeTask, openNewTask, showView, updateData])

  const virtualKey = (key) => {
    if (key === 'SHIFT') { setShift((value) => !value); return }
    if (key === 'CTRL') { setVirtualControl((value) => !value); return }
    if (key === 'ALT') { setVirtualAlt((value) => !value); return }
    if (key === 'CAPS') { setCaps((value) => !value); return }
    if (key === 'ESC') { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return }
    if (key === 'ARROWUP' || key === 'ARROWDOWN') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: key === 'ARROWUP' ? 'ArrowUp' : 'ArrowDown', bubbles: true }))
      return
    }
    if (key === 'TAB') {
      const focusable = [...document.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]')]
        .filter((element) => element.getClientRects().length)
      const current = focusable.indexOf(document.activeElement)
      focusable[(current + 1) % focusable.length]?.focus()
      return
    }
    if (key === 'ENTER') { document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); if (modal?.type === 'task') saveTask(); else if (modal?.type === 'entry') saveEntry(); return }
    const element = document.activeElement
    const printable = key === 'SPACE' ? ' ' : key === 'BACKSPACE' ? '' : ((shift !== caps) ? key : key.toLowerCase())
    if (virtualControl || virtualAlt) {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: key === 'SPACE' ? ' ' : key,
        code: key === '/' ? 'Slash' : key.length === 1 ? `Key${key.toUpperCase()}` : key,
        bubbles: true,
        ctrlKey: virtualControl,
        altKey: virtualAlt,
      }))
      setVirtualControl(false)
      setVirtualAlt(false)
      return
    }
    if (key === 'BACKSPACE' && element instanceof HTMLInputElement || key === 'BACKSPACE' && element instanceof HTMLTextAreaElement) {
      const start = element.selectionStart ?? element.value.length
      const end = element.selectionEnd ?? start
      element.setRangeText('', Math.max(0, start === end ? start - 1 : start), end, 'end')
      element.dispatchEvent(new Event('input', { bubbles: true }))
    } else if ((element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) && key !== 'BACKSPACE') {
      const start = element.selectionStart ?? element.value.length
      const end = element.selectionEnd ?? start
      element.setRangeText(printable, start, end, 'end')
      element.dispatchEvent(new Event('input', { bubbles: true }))
    } else if (key === 'SPACE') {
      const items = selectableItems()
      const item = document.activeElement instanceof HTMLElement ? document.activeElement.closest('[data-selectable="true"]') || items[selectedItem] : items[selectedItem]
      if (item?.dataset.toggleId) toggleTask(item.dataset.toggleId)
      else if (item?.dataset.habitId) toggleHabit(item.dataset.habitId)
    }
  }

  const streakFor = (habit) => {
    let count = 0
    let date = selectedDate
    while (habit.history[date]) { count += 1; date = shiftDate(date, -1) }
    if (!count && selectedDate === today()) {
      date = shiftDate(selectedDate, -1)
      while (habit.history[date]) { count += 1; date = shiftDate(date, -1) }
    }
    return count
  }
  return (
    <LanguageContext.Provider value={{ t, locale }}>
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); showView('dashboard') }}>
          <span className="brand-mark">d.</span><span>daylight<span className="brand-dot">.</span></span>
        </a>
        <div className="side-caption">{t('yourCorner')}</div>
        <nav className="side-nav" aria-label={t('home')}>
          {sections.map(([key, icon]) => <button key={key} data-selectable="true" className={`nav-item ${view === key ? 'active' : ''}`} onClick={() => showView(key)}><span className="nav-icon">{icon}</span>{t(key === 'dashboard' ? 'home' : key)}{key === 'dashboard' && <span className="nav-today-dot" />}</button>)}
          <button data-selectable="true" className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => showView('settings')}><span className="nav-icon">⚙</span>{t('settings')}</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="side-note"><span className="side-note-spark">✳</span><p>{t('reminder')}</p><span>{t('reminderText')}</span></div>
          <div className="profile-chip"><div className="avatar">✿</div><div><strong>{t('profile')}</strong><span>{t('profileCaption')}</span></div><span className="profile-more">···</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">{t('mySpace')} <span>/</span> {view === 'dashboard' ? t('todayUpper') : t(view === 'shortcuts' ? 'keyboardShortcuts' : view)}</div>
          <div className="top-actions">
            <button className="icon-button date-top" aria-label={t('chooseDate')} onClick={() => showView('calendar')}>▦</button>
            <button className="icon-button" aria-label={t('searchJournal')} onClick={() => { setSearchOpen(true); setTimeout(() => document.querySelector('.search-overlay input')?.focus(), 30) }}>⌕</button>
            <label className="language-quick" title={t('language')}><span>🌐</span><select aria-label={t('language')} value={locale} onChange={(event) => updateData((current) => ({ ...current, language: event.target.value }))}><option value="en">EN</option><option value="ru">RU</option><option value="ky">KY</option></select></label>
            {/* <button className="icon-button theme-toggle" aria-label={t('toggleTheme')} onClick={() => updateData((current) => ({ ...current, theme: current.theme === 'light' ? 'dark' : 'light' }))}>{data.theme === 'light' ? '☾' : '☀'}</button> */}
            {/* <button className="keyboard-toggle" onClick={() => updateData((current) => ({ ...current, keyboardOpen: !current.keyboardOpen }))}>⌨ <span>{t('keyboard')}</span></button> */}
          </div>
        </header>
        <div className="content-wrap">
          {view === 'dashboard' && <Dashboard date={selectedDate} locale={locale} hour={currentHour} tasks={tasks} habits={localizedHabits} entries={entries} completedTasks={completedTasks} completedHabits={completedHabits} progress={overallPercent} onView={showView} onTask={toggleTask} onHabit={toggleHabit} onNewTask={openNewTask} onNewEntry={openNewEntry} onDate={setSelectedDate} />}
          {view === 'planner' && <Planner date={selectedDate} locale={locale} onDate={navigateDate} onToday={() => setSelectedDate(today())} tasks={filteredTasks} allTasks={tasks} filter={taskFilter} setFilter={setTaskFilter} onToggle={toggleTask} onEdit={editTask} onDelete={removeTask} onAdd={openNewTask} onMarker={toggleMarker} />}
          {view === 'diary' && <Diary date={selectedDate} locale={locale} entries={entries} allEntries={data.entries} search={search} setSearch={setSearch} onAdd={openNewEntry} onEdit={editEntry} onDelete={removeEntry} onMarker={toggleMarker} />}
          {view === 'habits' && <Habits date={selectedDate} locale={locale} habits={localizedHabits} historyDate={setSelectedDate} streakFor={streakFor} onToggle={toggleHabit} onDelete={removeHabit} onAdd={addHabit} draft={habitDraft} setDraft={setHabitDraft} />}
          {view === 'calendar' && <Calendar date={selectedDate} locale={locale} setDate={setSelectedDate} tasks={localizedTasks} entries={data.entries} habits={localizedHabits} />}
          {view === 'progress' && <Progress date={selectedDate} locale={locale} tasks={localizedTasks} habits={localizedHabits} entries={data.entries} />}
          {view === 'settings' && <Settings data={data} locale={locale} updateData={updateData} onShortcuts={() => setView('shortcuts')} />}
          {view === 'shortcuts' && <Shortcuts onClose={() => setView('dashboard')} />}
        </div>
      </main>
      <nav className="mobile-nav" aria-label={t('keyboardNav')}>
        {sections.map(([key, icon]) => <button key={key} data-selectable="true" className={view === key ? 'active' : ''} onClick={() => showView(key)}><span>{icon}</span>{key === 'progress' ? t('stats') : t(key === 'dashboard' ? 'home' : key)}</button>)}
        <button data-selectable="true" onClick={() => showView('settings')} className={view === 'settings' ? 'active' : ''}><span>⚙</span>{t('settings')}</button>
      </nav>
      {data.keyboardOpen && <VirtualKeyboard onKey={virtualKey} shift={shift} locale={locale} onClose={() => updateData((current) => ({ ...current, keyboardOpen: false }))} />}
      {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close" aria-label={t('closeDialog')} onClick={() => setModal(null)}>×</button>
        {modal.type === 'task' ? <form onSubmit={saveTask}><span className="eyebrow">{t('planEyebrow')}</span><h2 id="modal-title">{t(modal.taskId ? 'editTask' : 'addTaskTitle')}</h2><label className="field-label">{t('taskPrompt')}<input ref={titleInput} value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} placeholder={t('taskPlaceholder')} required /></label><div className="field-row"><label className="field-label">{t('time')}<input type="time" value={taskDraft.time} onChange={(event) => setTaskDraft({ ...taskDraft, time: event.target.value })} /></label><label className="field-label">{t('priority')}<select value={taskDraft.priority} onChange={(event) => setTaskDraft({ ...taskDraft, priority: event.target.value })}><option value="Low">{t('low')}</option><option value="Medium">{t('medium')}</option><option value="High">{t('high')}</option></select></label></div><MarkerPicker value={taskDraft.marker} onChange={(marker) => setTaskDraft({ ...taskDraft, marker })} /><button className="primary-button full-button" type="submit">{t('saveTask')} <span>↗</span></button><p className="modal-hint">{t('pressEnterSave')}</p></form> : <form onSubmit={saveEntry}><span className="eyebrow">{t('momentToKeep')}</span><h2 id="modal-title">{t(modal.entryId ? 'editNote' : 'writeItDown')}</h2><p className="modal-date">{dateLabel(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' }, locale)}</p><textarea ref={entryInput} className="journal-editor" value={entryDraft} onChange={(event) => setEntryDraft(event.target.value)} placeholder={t('notePlaceholder')} rows="7" required /><button className="primary-button full-button" type="submit">{t('saveMoment')} <span>↗</span></button><p className="modal-hint">{t('ctrlEnterSave')}</p></form>}
      </div></div>}
      {searchOpen && <div className="search-overlay"><div className="search-dialog"><span>⌕</span><input aria-label={t('searchJournal')} autoFocus value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false); if (event.key === 'Enter') { showView('diary'); setSearchOpen(false) } }} placeholder={t('searchPlaceholder')} /><kbd>ESC</kbd><button aria-label={t('closeDialog')} onClick={() => setSearchOpen(false)}>×</button></div><div className="search-foot">{t('enterResults')} <span>⌘ K</span></div></div>}
    </div>
    </LanguageContext.Provider>
  )
}

function SectionHeader({ eyebrow, title, subtitle, action, children }) {
  return <div className="section-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="header-actions">{children}{action}</div></div>
}

function Dashboard({ date, locale, hour, tasks, habits, entries, completedTasks, completedHabits, progress, onView, onTask, onHabit, onNewTask, onNewEntry, onDate }) {
  const { t } = useLanguage()
  const greeting = hour < 12 ? t('greetingMorning') : hour < 18 ? t('greetingAfternoon') : t('greetingEvening')
  const quote = t(`quote${new Date(`${date}T12:00:00`).getDate() % 4 || 4}`)
  const shownTasks = [...tasks].slice(0, 4)
  return <div className="dashboard-view">
    <div className="welcome-row"><div><div className="greeting">{greeting} <span>✳</span></div><h1>{t('makeToday')} <em>{t('count')}</em></h1><p className="welcome-date">{dateLabel(date, { weekday: 'long', month: 'long', day: 'numeric' }, locale)}<span className="date-spark">✦</span></p></div><div className="date-switcher"><button aria-label={t('previousDay')} onClick={() => onDate(shiftDate(date, -1))}>←</button><button onClick={() => onDate(today())} className="today-button">{t('today')}</button><button aria-label={t('nextDay')} onClick={() => onDate(shiftDate(date, 1))}>→</button></div></div>
    <div className="dash-grid">
      <section className="card progress-card"><div className="card-topline"><span className="eyebrow">{t('glance')}</span><span className="soft-badge">{t('dailyCheckin')}</span></div><div className="progress-main"><div><h2>{t('findingRhythm')}</h2><p>{t('everyLittleThing')}</p></div><div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` }}><div><strong>{progress}<small>%</small></strong><span>{t('done')}</span></div></div></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="progress-legend"><span><i className="legend-dot blue-dot" />{t('tasksOf', { done: completedTasks, total: tasks.length })}</span><span><i className="legend-dot pink-dot" />{t('habitsOf', { done: completedHabits, total: habits.length })}</span><span>{date === today() ? t('today') : dateLabel(date, { month: 'short', day: 'numeric' }, locale)}<b>→</b></span></div></section>
      <section className="card quote-card"><div className="quote-spark">“</div><span className="eyebrow">{t('littleReminder')}</span><blockquote>{quote}</blockquote><div className="quote-bottom"><span>{t('noteToSelf')}</span><span>♡</span></div><div className="quote-decoration">✳</div></section>
      <section className="card tasks-card"><div className="card-heading"><div><span className="eyebrow">{t('onYourPlate')}</span><h2>{t('todaysTasks')} <span className="count-pill">{tasks.length}</span></h2></div><button className="text-link" onClick={() => onView('planner')}>{t('seeAll')} <span>↗</span></button></div><div className="mini-task-list">{shownTasks.length ? shownTasks.map((task) => <button key={task.id} className={`mini-task ${task.completed ? 'is-done' : ''}`} onClick={() => onTask(task.id)} data-selectable="true" data-toggle-id={task.id}><span className={`check-circle ${task.completed ? 'checked' : ''}`}>{task.completed ? '✓' : ''}</span><span className={`mini-task-name marker-${task.marker || 'none'}`}>{task.title}</span><time>{timeLabel(`2000-01-01T${task.time}`, locale)}</time></button>) : <div className="empty-small">{t('freshPage')}</div>}</div><button className="add-inline" onClick={onNewTask}><span>＋</span> {t('addTask')}</button></section>
      <section className="card habits-card"><div className="card-heading"><div><span className="eyebrow">{t('gentleRoutines')}</span><h2>{t('littleHabits')} <span className="count-pill pink-count">{completedHabits}/{habits.length}</span></h2></div><button className="text-link" onClick={() => onView('habits')}>{t('allHabits')} <span>↗</span></button></div><div className="mini-habits">{habits.slice(0, 4).map((habit) => <button key={habit.id} className={`habit-mini ${habit.history[date] ? 'is-done' : ''}`} onClick={() => onHabit(habit.id)} data-selectable="true" data-habit-id={habit.id}><span className={`check-circle pink-check ${habit.history[date] ? 'checked' : ''}`}>{habit.history[date] ? '✓' : ''}</span><span>{habit.sampleKey ? t(habit.sampleKey) : habit.name}</span>{habit.history[date] && <span className="habit-heart">♡</span>}</button>)}</div><button className="add-inline" onClick={() => onView('habits')}><span>＋</span> {t('buildRoutine')}</button></section>
      <section className="card quick-note-card"><div className="quick-note-decoration">✎</div><span className="eyebrow">{t('thoughtToKeep')}</span><h2>{t('leaveNote')}</h2><p>{t('catchThought')}</p><button className="primary-button" onClick={onNewEntry}>{t('writeNote')} <span>↗</span></button></section>
      <section className="card journal-card"><div className="card-heading"><div><span className="eyebrow">{t('fromJournal')}</span><h2>{t('littleMoments')}</h2></div><button className="text-link" onClick={() => onView('diary')}>{t('yourDiary')} <span>↗</span></button></div>{entries.length ? <div className="journal-preview">{entries.slice(0, 2).map((entry) => <div key={entry.id}><span className="journal-time">{timeLabel(entry.createdAt, locale)}</span><p>{entry.text}</p></div>)}</div> : <div className="empty-journal"><span>✿</span><p>{t('noPages')}<br />{t('unfolding')}</p><button onClick={onNewEntry}>{t('firstNote')} <span>↗</span></button></div>}</section>
    </div>
    <div className="dash-footer"><span>{t('momentAtATime')}</span><span>{t('madeWithLove')}</span></div>
  </div>
}

function MarkerPicker({ value, onChange }) {
  const { t } = useLanguage()
  return <div className="marker-picker"><span className="field-label">{t('highlightColor')} <small>{t('optional')}</small></span><div>{markerColors.map((color) => <button type="button" key={color} title={t(`marker${color[0].toUpperCase()}${color.slice(1)}`)} aria-label={t(`marker${color[0].toUpperCase()}${color.slice(1)}`)} className={`marker-swatch ${color} ${value === color ? 'selected' : ''}`} onClick={() => onChange(value === color ? '' : color)} />)}</div></div>
}

function TaskRow({ task, onToggle, onEdit, onDelete, onMarker, index }) {
  const { t } = useLanguage()
  return <div className={`task-row ${task.completed ? 'is-done' : ''} marker-bg-${task.marker || 'none'}`} data-selectable="true" data-toggle-id={task.id} data-delete-id={task.id} tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); onToggle(task.id) } }}>
    <span className="task-index">{String(index + 1).padStart(2, '0')}</span><time className="task-time">{task.time}</time><button className={`check-circle ${task.completed ? 'checked' : ''}`} aria-label={task.completed ? t('markIncomplete') : t('markComplete')} onClick={() => onToggle(task.id)}>{task.completed ? '✓' : ''}</button><button className="task-title" onClick={() => onEdit(task)}>{task.sampleKey ? t(task.sampleKey) : task.title}</button><span className={`priority priority-${task.priority.toLowerCase()}`}>{t(task.priority.toLowerCase())}</span><div className="task-actions"><button className="task-action highlight-action" title={t('chooseHighlight')} onClick={() => onMarker('tasks', task.id, markerColors[(markerColors.indexOf(task.marker) + 1 + markerColors.length) % markerColors.length])}>✎</button><button className="task-action" title={t('edit')} onClick={() => onEdit(task)}>↗</button><button className="task-action delete-action" title={t('delete')} onClick={() => onDelete(task.id)}>×</button></div>
  </div>
}

function Planner({ date, onDate, onToday, tasks, allTasks, filter, setFilter, onToggle, onEdit, onDelete, onAdd, onMarker }) {
  const { t, locale } = useLanguage()
  const groups = [['morning', '00:00', '11:59'], ['afternoon', '12:00', '16:59'], ['evening', '17:00', '23:59']]
  return <div className="inner-view"><SectionHeader eyebrow={t('planEyebrow')} title={t('yourDayPieces')} subtitle={dateLabel(date, { weekday: 'long', month: 'long', day: 'numeric' }, locale)} action={<><div className="date-switcher compact"><button aria-label={t('previousDay')} onClick={() => onDate(-1)}>←</button><button className="today-button" onClick={onToday}>{t('today')}</button><button aria-label={t('nextDay')} onClick={() => onDate(1)}>→</button></div><button className="primary-button" onClick={onAdd}>＋ {t('addTask')}</button></>} />
    <div className="planner-toolbar"><span className="toolbar-label">{t('thingsOnList', { count: tasks.length })}</span><div className="filter-tabs">{[['All', 'all'], ['To do', 'toDo'], ['Completed', 'completed']].map(([value, key]) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{t(key)}</button>)}</div></div>
    <div className="planner-progress card"><span>{t('littleWinsToday')}</span><div className="progress-track"><span style={{ width: `${allTasks.length ? Math.round(allTasks.filter((task) => task.completed).length / allTasks.length * 100) : 0}%` }} /></div><strong>{allTasks.length ? Math.round(allTasks.filter((task) => task.completed).length / allTasks.length * 100) : 0}%</strong><span className="progress-spark">✦</span></div>
    <div className="schedule-grid">{groups.map(([key, from, to]) => { const groupTasks = tasks.filter((task) => task.time >= from && task.time <= to); return <section className="schedule-section" key={key}><div className="schedule-heading"><span className={`daypart-icon ${key}`}>{key === 'morning' ? '☼' : key === 'afternoon' ? '◉' : '☾'}</span><div><h2>{t(key)}</h2><span>{t(key === 'morning' ? 'gentleStart' : key === 'afternoon' ? 'findFlow' : 'windDown')}</span></div><span className="schedule-count">{groupTasks.length}</span></div><div className="task-list">{groupTasks.length ? groupTasks.map((task, index) => <TaskRow key={task.id} task={task} index={index} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onMarker={onMarker} />) : <div className="schedule-empty">{t('nothingYet')}</div>}</div></section> })}</div>
    <div className="keyboard-hint">{t('tip')} <kbd>↑</kbd> <kbd>↓</kbd> {t('navigate')} <span>·</span> <kbd>{t('space')}</kbd> {t('complete')} <span>·</span> <kbd>DEL</kbd> {t('remove')}</div>
  </div>
}

function Diary({ date, locale, entries, allEntries, search, setSearch, onAdd, onEdit, onDelete, onMarker }) {
  const { t } = useLanguage()
  const visibleEntries = (search ? allEntries : entries).filter((entry) => !search || entry.text.toLowerCase().includes(search.toLowerCase()))
  return <div className="inner-view"><SectionHeader eyebrow={t('privatePages')} title={t('dearDiary')} subtitle={t('diaryIntro')} action={<button className="primary-button" onClick={onAdd}>＋ {t('newEntry')}</button>} /><div className="diary-date-row"><span className="date-stamp">✦</span><div><span className="eyebrow">{t('writingFor')}</span><strong>{dateLabel(date, { weekday: 'long', month: 'long', day: 'numeric' }, locale)}</strong></div><label className="diary-search"><span>⌕</span><input aria-label={t('searchEntries')} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('searchEntries')} /></label></div>{visibleEntries.length ? <div className="entry-list">{visibleEntries.map((entry) => <article className={`entry-card card marker-bg-${entry.marker || 'none'}`} key={entry.id}><div className="entry-date"><span className="entry-dot" /><time>{timeLabel(entry.createdAt, locale)}</time><span>{dateLabel(entry.date, { month: 'short', day: 'numeric' }, locale)}</span></div><p>{entry.text}</p><div className="entry-actions"><button onClick={() => onMarker('entries', entry.id, markerColors[(markerColors.indexOf(entry.marker) + 1 + markerColors.length) % markerColors.length])}>✎ {t('highlight')}</button><button onClick={() => onEdit(entry)}>{t('edit')} ↗</button><button onClick={() => onDelete(entry.id)}>{t('delete')} ×</button></div></article>)}</div> : <div className="diary-empty card"><div className="empty-flower">✿</div><h2>{search ? t('noMoments') : t('freshJournalPage')}</h2><p>{search ? t('tryAnother') : t('dayYours')}</p><button className="primary-button" onClick={onAdd}>{t('firstEntry')} <span>↗</span></button></div>}</div>
}

function Habits({ date, locale, habits, historyDate, streakFor, onToggle, onDelete, onAdd, draft, setDraft }) {
  const { t } = useLanguage()
  const completed = habits.filter((habit) => habit.history[date]).length
  return (
    <div className="inner-view">
      <SectionHeader eyebrow={t('habitsEyebrow')} title={t('habitsTitle')} subtitle={t('habitsIntro')} />
      <div className="habit-summary card">
        <div><span className="eyebrow">{t('todaysRhythm')}</span><h2>{completed} <span>/ {habits.length}</span></h2><p>{t('littlePromisesKept')}</p></div>
        <div className="habit-summary-bar"><div className="progress-track"><span style={{ width: `${habits.length ? completed / habits.length * 100 : 0}%` }} /></div><span>{t('percentOfHabits', { percent: habits.length ? Math.round(completed / habits.length * 100) : 0 })}</span></div>
        <div className="habit-summary-flower">✿</div>
      </div>
      <div className="habit-content-grid">
        <section className="card habit-list-card">
          <div className="card-heading"><div><span className="eyebrow">{t('yourRoutines')}</span><h2>{t('showUp')}</h2></div><span className="count-pill">{t('habitsCount', { count: habits.length })}</span></div>
          <div className="habit-list">{habits.map((habit) => {
            const name = habit.sampleKey ? t(habit.sampleKey) : habit.name
            return <div className={`habit-row ${habit.history[date] ? 'is-done' : ''}`} key={habit.id}><button className={`check-circle pink-check ${habit.history[date] ? 'checked' : ''}`} aria-label={`${habit.history[date] ? t('markIncomplete') : t('markComplete')}: ${name}`} onClick={() => onToggle(habit.id)} data-selectable="true" data-habit-id={habit.id}>{habit.history[date] ? '✓' : ''}</button><div className="habit-title"><strong>{name}</strong><span>{habit.history[date] ? t('showedUpToday') : t('oneDay')}</span></div><span className="streak-pill">🔥 {streakFor(habit)} <small>{t('dayStreak')}</small></span><button className="task-action delete-action" aria-label={`${t('delete')}: ${name}`} onClick={() => onDelete(habit.id)}>×</button></div>
          })}</div>
          <form className="add-habit-form" onSubmit={onAdd}><span>＋</span><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t('newHabitPlaceholder')} aria-label={t('newHabitName')} /><button type="submit">{t('addHabit')} ↗</button></form>
        </section>
        <section className="card habit-history-card">
          <span className="eyebrow">{t('lastSeven')}</span><h2>{t('showingUp')}</h2><p>{t('littleByLittle')}</p>
          <div className="habit-week">{Array.from({ length: 7 }, (_, index) => {
            const day = shiftDate(date, index - 6)
            const done = habits.filter((habit) => habit.history[day]).length
            return <button key={day} className="habit-day" aria-label={dateLabel(day, { weekday: 'long', month: 'long', day: 'numeric' }, locale)} onClick={() => historyDate(day)}><span>{weekdayLabel(day, locale, 'narrow')}</span><i className={done ? 'has-habits' : ''} style={{ '--habit-fill': `${habits.length ? done / habits.length * 100 : 0}%` }}>{done ? '✦' : ''}</i><small>{new Date(`${day}T12:00:00`).getDate()}</small></button>
          })}</div>
          <div className="history-legend"><i /> {t('littleProgress')}</div>
        </section>
      </div>
    </div>
  )
}

function Calendar({ date, locale, setDate, tasks, entries, habits }) {
  const { t } = useLanguage()
  const [offset, setOffset] = useState(0)
  const { year, month } = monthRange(date, offset)
  const first = new Date(year, month, 1)
  const days = new Date(year, month + 1, 0).getDate()
  const blanks = (first.getDay() + 6) % 7
  const monthLabel = monthYearLabel(first, locale)
  const weekdays = Array.from({ length: 7 }, (_, index) => weekdayLabel(new Date(2024, 0, 1 + index), locale).toLocaleUpperCase(localeTags[locale]))
  const selectedTasks = tasks.filter((task) => task.date === date)
  const selectedEntries = entries.filter((entry) => entry.date === date)
  const selectedHabits = habits.filter((habit) => habit.history[date])
  const choose = (day) => {
    setDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    if (offset) setOffset(0)
  }
  return (
    <div className="inner-view">
      <SectionHeader eyebrow={t('calendarEyebrow')} title={t('yourCalendar')} subtitle={t('calendarIntro')} action={<button className="today-button outlined" onClick={() => { setDate(today()); setOffset(0) }}>{t('backToday')}</button>} />
      <div className="calendar-layout">
        <section className="card calendar-card">
          <div className="calendar-top"><div><span className="eyebrow">{t('takeLook')}</span><h2>{monthLabel}</h2></div><div className="month-arrows"><button aria-label={t('previousMonth')} onClick={() => setOffset((value) => value - 1)}>←</button><button aria-label={t('nextMonth')} onClick={() => setOffset((value) => value + 1)}>→</button></div></div>
          <div className="weekday-row">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-days">
            {Array.from({ length: blanks }, (_, index) => <span className="calendar-blank" key={`blank-${index}`} />)}
            {Array.from({ length: days }, (_, index) => {
              const day = index + 1
              const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayTasks = tasks.filter((task) => task.date === iso)
              const hasNotes = entries.some((entry) => entry.date === iso)
              const hasHabits = habits.some((habit) => habit.history[iso])
              return <button key={day} aria-label={dateLabel(iso, { weekday: 'long', month: 'long', day: 'numeric' }, locale)} className={`calendar-day ${iso === date ? 'selected' : ''} ${iso === today() ? 'today' : ''}`} onClick={() => choose(day)}><span>{day}</span>{(hasNotes || dayTasks.some((task) => task.completed) || hasHabits) && <i className="calendar-markers">{hasNotes && <b className="marker-note" />}{dayTasks.some((task) => task.completed) && <b className="marker-task" />}{hasHabits && <b className="marker-habit" />}</i>}</button>
            })}
          </div>
          <div className="calendar-legend"><span><i className="marker-note" />{t('journal')}</span><span><i className="marker-task" />{t('tasks')}</span><span><i className="marker-habit" />{t('habits')}</span></div>
        </section>
        <aside className="card selected-day-card">
          <span className="eyebrow">{t('yourSelectedDay')}</span>
          <div className="selected-day-date"><strong>{new Date(`${date}T12:00:00`).getDate()}</strong><span>{dateLabel(date, { weekday: 'long', month: 'long', year: 'numeric' }, locale)}</span></div>
          <div className="day-detail"><h3>{t('tasks')} <span>{selectedTasks.filter((task) => task.completed).length}/{selectedTasks.length}</span></h3>{selectedTasks.length ? selectedTasks.slice(0, 4).map((task) => <div className="day-detail-row" key={task.id}><i className={task.completed ? 'done' : ''} />{task.title}<time>{timeLabel(task.time, locale)}</time></div>) : <p className="day-detail-empty">{t('noPlans')}</p>}</div>
          <div className="day-detail"><h3>{t('journal')} <span>{selectedEntries.length}</span></h3>{selectedEntries.length ? selectedEntries.slice(0, 1).map((entry) => <p className="day-entry-snippet" key={entry.id}>{entry.text}</p>) : <p className="day-detail-empty">{t('blankPage')}</p>}</div>
          <div className="day-detail"><h3>{t('habits')} <span>{selectedHabits.length}/{habits.length}</span></h3><p className="day-detail-empty">{selectedHabits.length ? selectedHabits.map((habit) => habit.name).join(' · ') : t('everyStep')}</p></div>
          <div className="date-day-controls"><button onClick={() => setDate(shiftDate(date, -1))}>← {t('previousDay')}</button><button onClick={() => setDate(shiftDate(date, 1))}>{t('nextDay')} →</button></div>
        </aside>
      </div>
    </div>
  )
}

function monthRange(date, offset) {
  const current = new Date(`${date}T12:00:00`)
  current.setMonth(current.getMonth() + offset)
  return { year: current.getFullYear(), month: current.getMonth() }
}

function Progress({ date, locale, tasks, habits, entries }) {
  const { t } = useLanguage()
  const start = shiftDate(date, -6)
  const weekDates = Array.from({ length: 7 }, (_, index) => shiftDate(start, index))
  const monthDates = Array.from({ length: new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0).getDate() }, (_, index) => `${date.slice(0, 7)}-${String(index + 1).padStart(2, '0')}`)
  const stats = (days) => {
    const filteredTasks = tasks.filter((task) => days.includes(task.date))
    const doneTasks = filteredTasks.filter((task) => task.completed).length
    const possible = habits.length * days.length
    const doneHabits = habits.reduce((total, habit) => total + days.filter((day) => habit.history[day]).length, 0)
    return { tasks: doneTasks, totalTasks: filteredTasks.length, habits: doneHabits, totalHabits: possible, percent: Math.round(((filteredTasks.length ? doneTasks / filteredTasks.length : 0) + (possible ? doneHabits / possible : 0)) / 2 * 100) }
  }
  const todayStats = stats([date])
  const weekStats = stats(weekDates)
  const monthStats = stats(monthDates)
  const totalEntries = entries.length
  const totalHabitCheckins = habits.reduce((total, habit) => total + Object.values(habit.history).filter(Boolean).length, 0)
  const dailyStreak = (() => { let n = 0; let day = date; while (tasks.some((task) => task.date === day && task.completed) || habits.some((habit) => habit.history[day])) { n++; day = shiftDate(day, -1) } return n })()
  const bestStreak = habits.reduce((best, habit) => {
    let current = 0
    let longest = 0
    const dates = Object.keys(habit.history).filter((day) => habit.history[day]).sort()
    dates.forEach((day, index) => { current = index && shiftDate(dates[index - 1], 1) === day ? current + 1 : 1; longest = Math.max(longest, current) })
    return Math.max(best, longest)
  }, 0)
  return <div className="inner-view"><SectionHeader eyebrow={t('progressEyebrow')} title={t('littleWins')} subtitle={t('progressIntro')} /><div className="stats-hero card"><div className="stats-hero-copy"><span className="eyebrow">{t('todaysProgress')}</span><h2>{t('growing')}</h2><p>{t('dateIsYours', { date: dateLabel(date, { weekday: 'long', month: 'long', day: 'numeric' }, locale) })}</p><div className="stats-ring-row"><div className="progress-ring large-ring" style={{ '--progress': `${todayStats.percent * 3.6}deg` }}><div><strong>{todayStats.percent}<small>%</small></strong><span>{t('ofToday')}</span></div></div><div className="stats-hero-breakdown"><span><i className="legend-dot blue-dot" />{t('tasks')} <strong>{todayStats.tasks}/{todayStats.totalTasks}</strong></span><span><i className="legend-dot pink-dot" />{t('habits')} <strong>{todayStats.habits}/{habits.length}</strong></span></div></div></div><div className="stats-hero-art">✿<span>✦</span></div></div><div className="stats-overview-grid"><StatCard label={t('thisWeek')} title={t('weekBloom')} stat={weekStats} tone="blue" days={weekDates} tasks={tasks} habits={habits} locale={locale} /><StatCard label={t('thisMonth')} title={t('allMoments')} stat={monthStats} tone="pink" days={monthDates} tasks={tasks} habits={habits} locale={locale} /></div><div className="metric-grid"><div className="metric-card card"><span className="metric-icon pink-icon">♡</span><span className="eyebrow">{t('journalPages')}</span><strong>{totalEntries}</strong><span>{t('momentsKept')}</span></div><div className="metric-card card"><span className="metric-icon blue-icon">✓</span><span className="eyebrow">{t('tasksCompletedLabel')}</span><strong>{tasks.filter((task) => task.completed).length}</strong><span>{t('winsAllTime')}</span></div><div className="metric-card card"><span className="metric-icon pink-icon">↻</span><span className="eyebrow">{t('habitCheckinsLabel')}</span><strong>{totalHabitCheckins}</strong><span>{t('promisesKept')}</span></div><div className="metric-card card"><span className="metric-icon green-icon">🔥</span><span className="eyebrow">{t('currentStreak')}</span><strong>{dailyStreak}<small> {t('days')}</small></strong><span>{t('youveGotThis')}</span></div><div className="metric-card card"><span className="metric-icon lilac-icon">✦</span><span className="eyebrow">{t('bestHabitStreak')}</span><strong>{bestStreak}<small> {t('days')}</small></strong><span>{t('personalBest')}</span></div></div></div>
}

function StatCard({ label, title, stat, tone, days, tasks, habits, locale }) {
  const { t } = useLanguage()
  return (
    <section className={`card stat-card ${tone}`}>
      <div className="stat-card-top"><div><span className="eyebrow">{label}</span><h2>{title}</h2></div><strong>{stat.percent}%</strong></div>
      <div className="stat-bars">{days.map((day) => {
        const dayTasks = tasks.filter((task) => task.date === day)
        const done = dayTasks.filter((task) => task.completed).length + habits.filter((habit) => habit.history[day]).length
        const total = dayTasks.length + habits.length
        return <div className="stat-bar-col" key={day}><span className="bar-tooltip">{total ? Math.round(done / total * 100) : 0}%</span><div className="stat-bar"><i style={{ height: `${total ? Math.max(4, done / total * 100) : 4}%` }} /></div><small>{weekdayLabel(day, locale, 'narrow')} {new Date(`${day}T12:00:00`).getDate()}</small></div>
      })}</div>
      <div className="stat-card-bottom"><span>{t('tasksOf', { done: stat.tasks, total: stat.totalTasks })} {t('completed').toLowerCase()}</span><span>{stat.habits} {t('habitCheckins')}</span></div>
    </section>
  )
}

function Settings({ data, locale, updateData, onShortcuts }) {
  const { t } = useLanguage()
  return <div className="inner-view"><SectionHeader eyebrow={t('settingsEyebrow')} title={t('yourSettings')} subtitle={t('settingsIntro')} /><div className="settings-grid"><section className="card settings-card"><span className="eyebrow">{t('appearance')}</span><h2>{t('pickAtmosphere')}</h2><p>{t('chooseLight')}</p><div className="theme-choices"><button className={`theme-choice light-choice ${data.theme === 'light' ? 'chosen' : ''}`} onClick={() => updateData((current) => ({ ...current, theme: 'light' }))}><span>☀</span><strong>{t('daylight')}</strong><small>{t('softBright')}</small></button><button className={`theme-choice dark-choice ${data.theme === 'dark' ? 'chosen' : ''}`} onClick={() => updateData((current) => ({ ...current, theme: 'dark' }))}><span>☾</span><strong>{t('moonlight')}</strong><small>{t('easyEyes')}</small></button></div></section><section className="card settings-card"><span className="eyebrow">{t('language')}</span><h2>{t('chooseLanguage')}</h2><LanguageSelector value={locale} onChange={(language) => updateData((current) => ({ ...current, language }))} /></section></div></div>
}

function LanguageSelector({ value, onChange }) {
  const { t } = useLanguage()
  return <label className="language-selector"><span>🌐</span><select aria-label={t('language')} value={value} onChange={(event) => onChange(event.target.value)}><option value="en">🇬🇧 {t('languageEnglish')}</option><option value="ru">🇷🇺 {t('languageRussian')}</option><option value="ky">🇰🇬 {t('languageKyrgyz')}</option></select></label>
}

function Shortcuts({ onClose }) {
  const { t } = useLanguage()
  const rows = [['Enter', 'shortcutEnter'], ['Esc', 'shortcutEsc'], ['Ctrl + Enter', 'shortcutCtrlEnter'], ['Ctrl + K', 'shortcutCtrlK'], ['Ctrl + N', 'shortcutCtrlN'], ['Ctrl + H', 'shortcutCtrlH'], ['Ctrl + D', 'shortcutCtrlD'], ['Ctrl + P', 'shortcutCtrlP'], ['Ctrl + C', 'shortcutCtrlC'], ['Ctrl + /', 'shortcutCtrlSlash'], ['↑ / ↓', 'shortcutArrows'], ['Space', 'shortcutSpace'], ['Delete', 'shortcutDelete']]
  return <div className="inner-view"><SectionHeader eyebrow={t('shortcutsEyebrow')} title={t('shortcutsTitle')} subtitle={t('shortcutsIntro')} action={<button className="text-link" onClick={onClose}>{t('backToDay')}</button>} /><div className="card shortcuts-card"><div className="shortcuts-heading"><span>{t('theKeys')}</span><span>{t('whatTheyDo')}</span></div>{rows.map(([key, action]) => <div className="shortcut-row" key={key}><kbd>{key}</kbd><span>{t(action)}</span></div>)}</div><div className="shortcut-footer">{t('escHint')}</div></div>
}

function VirtualKeyboard({ onKey, shift, onClose }) {
  const { t } = useLanguage()
  const rows = [['ESC', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'BACKSPACE'], ['TAB', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'], ['CAPS', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'ENTER'], ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'SHIFT'], ['CTRL', 'ALT', 'SPACE', 'ALT', 'CTRL']]
  const specialLabels = { ESC: 'escape', TAB: 'tab', CAPS: 'caps', BACKSPACE: 'backspace', ENTER: 'enter', SHIFT: 'shift', CTRL: 'control', ALT: 'alt', SPACE: 'space' }
  return <div className="virtual-keyboard"><div className="keyboard-head"><span><i />{t('onScreenKeyboard')}</span><div><button className="keyboard-arrow-key" onMouseDown={(event) => event.preventDefault()} onClick={() => onKey('ARROWUP')} aria-label="↑">↑</button><button className="keyboard-arrow-key" onMouseDown={(event) => event.preventDefault()} onClick={() => onKey('ARROWDOWN')} aria-label="↓">↓</button><button onClick={onClose} aria-label={t('closeDialog')}>×</button></div></div>{rows.map((row, rowIndex) => <div className={`key-row row-${rowIndex}`} key={rowIndex}>{row.map((key, index) => <button key={`${key}-${index}`} title={specialLabels[key] ? t(specialLabels[key]) : key} aria-label={specialLabels[key] ? t(specialLabels[key]) : key} className={`virtual-key ${['BACKSPACE', 'ENTER', 'SHIFT', 'SPACE', 'TAB', 'CAPS'].includes(key) ? 'wide-key' : ''} ${key === 'SPACE' ? 'space-key' : ''} ${key === 'SHIFT' && shift ? 'key-active' : ''}`} onMouseDown={(event) => event.preventDefault()} onClick={() => onKey(key)}>{key === 'BACKSPACE' ? '⌫' : specialLabels[key] ? t(specialLabels[key]) : key}</button>)}</div>)}</div>
}

export default App
