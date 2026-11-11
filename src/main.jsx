import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import AuthGate from './AuthGate'
import VaultPage from './VaultPage'
import {
  Activity, ArrowDownRight, ArrowRight, Bell, CalendarDays, Check, CheckCheck,
  ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Command, Download,
  Ellipsis, Eye, FileText, Filter, FolderKanban, Gauge, LayoutDashboard, ListTodo,
  LockKeyhole, LogOut, MessageCircle, MoreHorizontal, Plus, Search, Settings,
  ShieldCheck, SlidersHorizontal, Sparkles, Users, X, Zap, CircleAlert, CheckCircle2,
  Circle, Menu, Send, Paperclip, History, CalendarClock, PanelRight, TrendingUp
} from 'lucide-react'
import './styles.css'

const getTimeGreeting = (date, name) => {
  const hour = date.getHours()
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const greetings = {
    morning: [['Good morning', '☀️'], ['Habari za asubuhi', '🌅'], ['Buenos días', '🌞'], ['Buongiorno', '✨'], ['Bonjour', '🌤️'], ['Aloha kakahiaka', '🌺']],
    afternoon: [['Good afternoon', '🌤️'], ['Habari za mchana', '☀️'], ['Buenas tardes', '🌻'], ['Buon pomeriggio', '✨'], ['Bon après-midi', '🌿'], ['Aloha awakea', '🌴']],
    evening: [['Good evening', '🌙'], ['Habari za jioni', '🌆'], ['Buenas noches', '🌙'], ['Buonasera', '✨'], ['Bonsoir', '🌃'], ['Aloha ahiahi', '🌺']]
  }
  const day = Math.floor(date.getTime() / 86400000)
  const options = greetings[period]
  const [phrase, emoji] = options[((day % options.length) + options.length) % options.length]
  const cleanName = String(name || '').trim().split(/\s+/)[0]
  return phrase + (cleanName ? ', ' + cleanName : '') + '! ' + emoji
}

const initialProjects = [
  { id: 1, name: 'Client Portal Redesign', client: 'Northstar Group', color: '#3478f6', progress: 72, status: 'On track', due: 'Nov 18, 2026', lead: 'Amara W.', tasks: 18, done: 13 },
  { id: 2, name: 'Operations Automation', client: 'Northstar Group', color: '#8b6ae8', progress: 48, status: 'At risk', due: 'Nov 08, 2026', lead: 'Daniel K.', tasks: 21, done: 10 },
  { id: 3, name: 'Brand & Website Refresh', client: 'Maji Health', color: '#18a999', progress: 86, status: 'On track', due: 'Nov 24, 2026', lead: 'Amara W.', tasks: 14, done: 12 },
  { id: 4, name: 'Data Migration', client: 'Maji Health', color: '#e6a23c', progress: 31, status: 'Delayed', due: 'Oct 27, 2026', lead: 'Peter M.', tasks: 16, done: 5 }
]
const initialTasks = [
  { id: 101, projectId: 1, title: 'Approve revised onboarding screens', project: 'Client Portal Redesign', assignee: 'You', initials: 'YO', due: 'Oct 30', date: '2026-10-30', status: 'In review', priority: 'High', progress: 90, comments: 4, type: 'Design', history: [{ who: 'Amara W.', what: 'Changed status from In progress to In review', when: 'Today, 9:42 AM' }, { who: 'You', what: 'Added a review note and attached the updated screens', when: 'Yesterday, 4:18 PM' }], discussion: [{ who: 'Amara W.', initials: 'AW', time: 'Today, 9:42 AM', text: 'The updated screens are ready. Could you confirm the copy and final CTA?' }, { who: 'You', initials: 'YO', time: 'Today, 10:03 AM', text: 'Reviewing now — I will add any final notes here.' }] },
  { id: 102, projectId: 2, title: 'Confirm automation acceptance criteria', project: 'Operations Automation', assignee: 'You', initials: 'YO', due: 'Oct 29', date: '2026-10-29', status: 'In progress', priority: 'High', progress: 55, comments: 7, type: 'Planning', history: [{ who: 'Daniel K.', what: 'Updated due date from Oct 27 to Oct 29', when: 'Yesterday, 2:12 PM' }], discussion: [{ who: 'Daniel K.', initials: 'DK', time: 'Yesterday, 2:15 PM', text: 'I updated the criteria based on the client workshop. Please check the last two acceptance points.' }] },
  { id: 103, projectId: 4, title: 'Validate migrated customer records', project: 'Data Migration', assignee: 'You', initials: 'YO', due: 'Oct 27', date: '2026-10-27', status: 'Blocked', priority: 'Urgent', progress: 25, comments: 3, type: 'Engineering', history: [{ who: 'Peter M.', what: 'Marked task as Blocked — waiting for source export', when: 'Oct 26, 3:06 PM' }], discussion: [{ who: 'Peter M.', initials: 'PM', time: 'Oct 26, 3:06 PM', text: 'We need the final export before validation can continue.' }] },
  { id: 104, projectId: 3, title: 'Review homepage content', project: 'Brand & Website Refresh', assignee: 'You', initials: 'YO', due: 'Nov 02', date: '2026-11-02', status: 'To do', priority: 'Medium', progress: 0, comments: 2, type: 'Content', history: [{ who: 'Amara W.', what: 'Assigned task to you', when: 'Oct 24, 11:20 AM' }], discussion: [{ who: 'Amara W.', initials: 'AW', time: 'Oct 24, 11:20 AM', text: 'Please review the copy deck before the next client checkpoint.' }] },
  { id: 105, projectId: 1, title: 'Run accessibility QA', project: 'Client Portal Redesign', assignee: 'You', initials: 'YO', due: 'Nov 04', date: '2026-11-04', status: 'To do', priority: 'Medium', progress: 0, comments: 0, type: 'QA', history: [{ who: 'Amara W.', what: 'Created task', when: 'Oct 25, 1:05 PM' }], discussion: [] },
  { id: 106, projectId: 3, title: 'Publish approved brand assets', project: 'Brand & Website Refresh', assignee: 'You', initials: 'YO', due: 'Oct 28', date: '2026-10-28', status: 'Done', priority: 'Low', progress: 100, comments: 1, type: 'Design', history: [{ who: 'You', what: 'Marked task as Done', when: 'Oct 28, 12:40 PM' }], discussion: [] }
]
const notificationsSeed = [
  { id: 1, title: 'Task due soon', body: 'Approve revised onboarding screens is due tomorrow.', time: '12 min ago', unread: true, icon: CalendarClock },
  { id: 2, title: 'New comment', body: 'Amara W. commented on onboarding screens.', time: '48 min ago', unread: true, icon: MessageCircle },
  { id: 3, title: 'Task completed', body: 'Publish approved brand assets was marked complete.', time: 'Yesterday', unread: false, icon: CheckCircle2 }
]
const statusClass = s => s.toLowerCase().replaceAll(' ', '-')
const dueKind = task => task.status === 'Done' ? 'complete' : task.date && task.date < new Date().toISOString().slice(0,10) ? 'delayed' : task.date && task.date <= new Date(Date.now()+86400000).toISOString().slice(0,10) ? 'soon' : 'track'
const loadState = (key, fallback) => { try { const value = localStorage.getItem(`centric-nexus:${key}`); return value ? JSON.parse(value) : fallback } catch { return fallback } }

function WorkspaceApp({ user }) {
  const [page, setPage] = useState('Overview')
  const [role, setRole] = useState(user?.role || 'Client viewer')
  const isSuper = user?.superAdmin === true
  const features = user?.features || {}
  const canFeature = feature => isSuper || features[feature] === true
  const [projects, setProjects] = useState(() => loadState('projects', initialProjects))
  const [tasks, setTasks] = useState(() => loadState('tasks', initialTasks))
  const [selectedTask, setSelectedTask] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All tasks')
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState(() => loadState('notifications', notificationsSeed))
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [projectDraft, setProjectDraft] = useState('')
  const [taskDraft, setTaskDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [workspaceName, setWorkspaceName] = useState(() => loadState('workspaceName', 'Centric workspace'))
  const [defaultTaskView, setDefaultTaskView] = useState(() => loadState('defaultTaskView', 'Overview'))
  const [weeklyDigest, setWeeklyDigest] = useState(() => loadState('weeklyDigest', true))
  const [toast, setToast] = useState('')
  const [preferredName, setPreferredName] = useState(user?.displayName || '')
  const [clockNow, setClockNow] = useState(() => new Date())
  useEffect(() => { const timer = window.setInterval(() => setClockNow(new Date()), 60000); return () => window.clearInterval(timer) }, [])
  const greeting = getTimeGreeting(clockNow, preferredName || user?.displayName || '')
  const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(clockNow).toUpperCase()
  useEffect(() => { localStorage.setItem('centric-nexus:projects', JSON.stringify(projects)) }, [projects])
  useEffect(() => { localStorage.setItem('centric-nexus:tasks', JSON.stringify(tasks)) }, [tasks])
  useEffect(() => { localStorage.setItem('centric-nexus:notifications', JSON.stringify(notifications)) }, [notifications])
  useEffect(() => { localStorage.setItem('centric-nexus:workspaceName', JSON.stringify(workspaceName)) }, [workspaceName])
  useEffect(() => { localStorage.setItem('centric-nexus:defaultTaskView', JSON.stringify(defaultTaskView)) }, [defaultTaskView])
  useEffect(() => { localStorage.setItem('centric-nexus:weeklyDigest', JSON.stringify(weeklyDigest)) }, [weeklyDigest])
  const canEdit = ['Project editor', 'Admin', 'Centric super admin'].includes(role)
  const unread = notifications.filter(n => n.unread).length

  const visibleTasks = useMemo(() => tasks.filter(t => {
    const matchesSearch = `${t.title} ${t.project} ${t.assignee}`.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'All tasks' || (filter === 'Delayed' && dueKind(t) === 'delayed') || (filter === 'On track' && ['track', 'complete'].includes(dueKind(t))) || t.status === filter
    return matchesSearch && matchesFilter
  }), [tasks, search, filter])

  const updateTask = (id, patch) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch, history: [{ who: 'You', what: Object.entries(patch).map(([k,v]) => `${k.replace(/([A-Z])/g,' $1').toLowerCase()} → ${v}`).join(', '), when: 'Just now' }, ...t.history] } : t))
    setSelectedTask(prev => prev?.id === id ? { ...prev, ...patch, history: [{ who: 'You', what: 'Updated task details', when: 'Just now' }, ...prev.history] } : prev)
  }
  const createProject = () => {
    if (!projectDraft.trim()) { setToast('Enter a project name first.'); return }
    if (projects.some(p => p.name.toLowerCase() === projectDraft.trim().toLowerCase())) { setToast('A project with that name already exists.'); return }
    const project = { id: Date.now(), name: projectDraft.trim(), client: 'New client', color: '#3478f6', progress: 0, status: 'On track', due: 'Set timeline', lead: 'You', tasks: 0, done: 0 }
    setProjects(p => [project, ...p]); setProjectDraft(''); setShowNewProject(false); setPage('Projects'); setToast('Project created and saved in this browser.')
  }
  const deleteProject = id => { const project = projects.find(p => p.id === id); if (!project) return; if (!window.confirm(`Delete “${project.name}” and all its tasks? This cannot be undone.`)) return; setProjects(ps => ps.filter(p => p.id !== id)); setTasks(ts => ts.filter(t => t.projectId !== id)); if (selectedTask && tasks.some(t => t.id === selectedTask.id && t.projectId === id)) setSelectedTask(null); setToast('Project and its tasks deleted.') }
  const createTask = () => {
    if (!taskDraft.trim()) return
    const project = projects[0]
    const task = { id: Date.now(), projectId: project?.id || 1, title: taskDraft.trim(), project: project?.name || 'Client Portal Redesign', assignee: 'You', initials: 'YO', due: 'Set date', date: '2026-11-05', status: 'To do', priority: 'Medium', progress: 0, comments: 0, type: 'Task', history: [{ who: 'You', what: 'Created task', when: 'Just now' }], discussion: [] }
    setTasks(t => [task, ...t]); setProjects(ps => ps.map(p => p.id === task.projectId ? {...p, tasks: p.tasks + 1} : p)); setTaskDraft(''); setShowNewTask(false); setSelectedTask(task); setToast('Task created and saved in this browser.')
  }
  const addComment = () => {
    if (!commentDraft.trim() || !selectedTask) return
    const comment = { who: 'You', initials: 'YO', time: 'Just now', text: commentDraft.trim() }
    const updated = { ...selectedTask, comments: selectedTask.comments + 1, discussion: [...selectedTask.discussion, comment], history: [{ who: 'You', what: 'Added a comment', when: 'Just now' }, ...selectedTask.history] }
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t)); setSelectedTask(updated); setCommentDraft('')
  }
  const markAllRead = () => setNotifications(ns => ns.map(n => ({ ...n, unread: false })))

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <img src="/logo.png" alt="Centric Nexus logo" />
        <div><strong>centric <span>nexus</span></strong><small>PROJECT WORKSPACE</small></div>
        <button className="icon-button mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button>
      </div>
      <div className="workspace-switch"><div className="workspace-avatar">CN</div><div><strong>{workspaceName}</strong><small>Client delivery team</small></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>
        {canFeature('Overview')&&<NavButton icon={LayoutDashboard} label="Overview" page={page} setPage={setPage}/>}
        {canFeature('Projects')&&<NavButton icon={FolderKanban} label="Projects" page={page} setPage={setPage} count={projects.length}/>}
        {canFeature('My tasks')&&<NavButton icon={ListTodo} label="My tasks" page={page} setPage={setPage} count={tasks.filter(t => t.assignee === 'You' && t.status !== 'Done').length}/>}
        {canFeature('Timeline')&&<NavButton icon={CalendarDays} label="Timeline" page={page} setPage={setPage}/>}
        {canFeature('Discussions')&&<NavButton icon={MessageCircle} label="Discussions" page={page} setPage={setPage}/>}
      </nav>
      <div className="nav-label nav-label-spaced">MANAGE</div>
      <nav>
        {canFeature('Team & access')&&<NavButton icon={Users} label="Team & access" page={page} setPage={setPage}/>}
        {canFeature('Activity log')&&<NavButton icon={Activity} label="Activity log" page={page} setPage={setPage}/>}
        <NavButton icon={LockKeyhole} label="Clients Tools Access" page={page} setPage={setPage}/>
        <NavButton icon={Settings} label="Settings" page={page} setPage={setPage}/>
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><strong>Need a hand?</strong><p>Explore the workspace guide and get more from Nexus.</p><button onClick={() => setPage('Help')}>Open help center <ArrowRight size={13}/></button></div>
        <div className="profile-row"><div className="avatar avatar-blue">YO</div><div className="profile-copy"><strong>Your workspace</strong><small>{role}</small></div><MoreHorizontal size={18}/></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)}><Menu size={19}/></button>
        <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14}/><strong>{page}</strong></div>
        <div className="top-actions">
          <label className="search-box"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search anything..." /><kbd>⌘ K</kbd></label>

          <div className="notification-wrap"><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setShowNotifications(!showNotifications)}><Bell size={18}/>{unread > 0 && <i/>}</button>
          {showNotifications && <div className="notification-popover"><div className="popover-head"><div><strong>Notifications</strong><small>{unread} unread updates</small></div><button className="text-button" onClick={markAllRead}>Mark all read</button></div>{notifications.map(n => <div key={n.id} className={`notification-item ${n.unread ? 'unread' : ''}`}><div className="notification-icon"><n.icon size={16}/></div><div><strong>{n.title}</strong><p>{n.body}</p><small>{n.time}</small></div>{n.unread && <span className="unread-dot"/>}</div>)}<button className="all-notifications" onClick={() => {setPage('Notifications');setShowNotifications(false)}}>View notification center <ArrowRight size={14}/></button></div>}</div>
          <div className="signed-in-user" title={user?.email || 'Signed in'}>{user?.email || 'Signed in'}</div><button className="button-secondary signout-button" onClick={() => signOut(auth).catch(error => window.alert(error.message))}><LogOut size={14}/> Sign out</button>
        </div>
      </header>

      <div className="content">
        {page === 'Overview' && canFeature('Overview') && <Overview projects={projects} tasks={visibleTasks} allTasks={tasks} setPage={setPage} setSelectedTask={setSelectedTask} setFilter={setFilter} setShowNewProject={setShowNewProject} canEdit={canEdit} greeting={greeting} todayLabel={todayLabel}/>}
        {page === 'Projects' && canFeature('Projects') && <Projects projects={projects} tasks={tasks} setSelectedTask={setSelectedTask} setShowNewProject={setShowNewProject} canEdit={canEdit} setPage={setPage} deleteProject={deleteProject}/>}
        {page === 'My tasks' && canFeature('My tasks') && <TasksPage tasks={visibleTasks} setSelectedTask={setSelectedTask} filter={filter} setFilter={setFilter} canEdit={canEdit} updateTask={updateTask} setShowNewTask={setShowNewTask}/>}
        {page === 'Timeline' && canFeature('Timeline') && <Timeline projects={projects} tasks={tasks} setSelectedTask={setSelectedTask}/>}
        {page === 'Discussions' && canFeature('Discussions') && <Discussions tasks={tasks} setSelectedTask={setSelectedTask}/>}
        {page === 'Team & access' && canFeature('Team & access') && <Access role={role} setRole={setRole} isSuper={isSuper}/>}
        {page === 'Activity log' && canFeature('Activity log') && <ActivityLog tasks={tasks}/>}
        {page === 'Settings' && <SettingsPage user={user} role={role} workspaceName={workspaceName} setWorkspaceName={setWorkspaceName} defaultTaskView={defaultTaskView} setDefaultTaskView={setDefaultTaskView} weeklyDigest={weeklyDigest} setWeeklyDigest={setWeeklyDigest} setToast={setToast} preferredName={preferredName} setPreferredName={setPreferredName}/>}
        {page === 'Clients Tools Access' && <VaultPage user={user} role={role}/>}
      {page === 'Notifications' && <NotificationsPage notifications={notifications} setNotifications={setNotifications}/>}
        {page === 'Help' && <HelpPage/>}
      </div>
      {toast && <div className="cn-toast" role="status">{toast}<button aria-label="Dismiss message" onClick={() => setToast('')}><X size={14}/></button></div>}
      <footer className="footer"><span>© 2026 Centric Nexus</span><span><span className="online-dot"/> All systems operational</span><span>Built for clarity. Designed for momentum.</span></footer>
    </main>

    {selectedTask && <TaskDrawer task={tasks.find(t => t.id === selectedTask.id) || selectedTask} onClose={() => setSelectedTask(null)} canEdit={canEdit} updateTask={updateTask} commentDraft={commentDraft} setCommentDraft={setCommentDraft} addComment={addComment}/>}
    {showNewProject && <Modal title="Create a project" subtitle="Set up a new client project workspace." onClose={() => setShowNewProject(false)}><label className="field-label">Project name<input autoFocus value={projectDraft} onChange={e => setProjectDraft(e.target.value)} placeholder="e.g. Website redesign" onKeyDown={e => e.key === 'Enter' && createProject()}/></label><label className="field-label">Client / organization<input placeholder="Client name"/></label><label className="field-label">Project lead<select defaultValue="You"><option>You</option><option>Amara W.</option><option>Daniel K.</option></select></label><div className="modal-actions"><button className="button-secondary" onClick={() => setShowNewProject(false)}>Cancel</button><button className="button-primary" onClick={createProject}><Plus size={15}/> Create project</button></div></Modal>}
    {showNewTask && <Modal title="Create a task" subtitle="Add a task to your workspace." onClose={() => setShowNewTask(false)}><label className="field-label">Task title<input autoFocus value={taskDraft} onChange={e => setTaskDraft(e.target.value)} placeholder="What needs to get done?" onKeyDown={e => e.key === 'Enter' && createTask()}/></label><label className="field-label">Project<select defaultValue={projects[0]?.name}>{projects.map(p => <option key={p.id}>{p.name}</option>)}</select></label><label className="field-label">Assignee<select defaultValue="You"><option>You</option><option>Amara W.</option><option>Daniel K.</option><option>Peter M.</option></select></label><div className="modal-actions"><button className="button-secondary" onClick={() => setShowNewTask(false)}>Cancel</button><button className="button-primary" onClick={createTask}><Plus size={15}/> Create task</button></div></Modal>}
  </div>
}

function NavButton({ icon: Icon, label, page, setPage, count }) {
  return <button className={`nav-item ${page === label ? 'active' : ''}`} onClick={() => setPage(label)}><Icon size={17}/><span>{label}</span>{count !== undefined && <small>{count}</small>}</button>
}
function PageHeading({ eyebrow, title, description, actions }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="heading-actions">{actions}</div></div>
}
function Overview({ projects, tasks, allTasks, setPage, setSelectedTask, setFilter, setShowNewProject, canEdit, greeting, todayLabel }) {
  const overdue = allTasks.filter(t => dueKind(t) === 'delayed')
  const active = allTasks.filter(t => t.status !== 'Done')
  const done = allTasks.filter(t => t.status === 'Done')
  return <>
    <PageHeading eyebrow={todayLabel} title={greeting} description="Your day, your people, your momentum. Here’s what’s moving across your workspace." actions={<><button className="button-secondary" onClick={() => {setPage('Projects')}}><FolderKanban size={15}/> All projects</button>{canEdit && <button className="button-primary" onClick={() => setShowNewProject(true)}><Plus size={16}/> New project</button>}</>}/>
    <div className="welcome-banner"><div className="welcome-copy"><div className="welcome-pill"><Sparkles size={13}/> YOUR WORKSPACE AT A GLANCE</div><h2>Make progress visible.<br/><span>Keep everyone in sync.</span></h2><p>One connected view of your work, deadlines and team momentum.</p><button onClick={() => setPage('My tasks')}>View my tasks <ArrowRight size={15}/></button></div><div className="banner-art"><div className="art-ring ring-one"/><div className="art-ring ring-two"/><div className="art-card art-card-main"><div className="art-card-head"><span/><span/><span/></div><div className="art-check"><Check size={19}/></div><div className="art-line long"/><div className="art-line medium"/><div className="art-progress"><span/></div></div><div className="art-card art-card-small"><div className="art-mini-icon"><TrendingUp size={16}/></div><div><strong>+18.4%</strong><small>Team momentum</small></div></div><div className="art-check-float"><CheckCheck size={18}/></div></div></div>
    <div className="stats-grid">
      <StatCard icon={FolderKanban} label="Active projects" value={projects.length} meta="Across your workspace" tint="blue" trend="All in one place"/>
      <StatCard icon={ListTodo} label="Open tasks" value={active.length} meta={`${done.length} tasks completed`} tint="purple" trend={`${Math.round(done.length/Math.max(allTasks.length,1)*100)}% completion`}/>
      <StatCard icon={CircleAlert} label="Delayed tasks" value={overdue.length} meta="Need attention" tint="orange" trend="Review deadlines"/>
      <StatCard icon={CheckCircle2} label="Completed tasks" value={done.length} meta="Good work adds up" tint="green" trend="This workspace"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel project-panel"><div className="panel-heading"><div><h3>Project overview</h3><p>Progress across your active projects</p></div><button className="text-button" onClick={() => setPage('Projects')}>View all <ArrowRight size={14}/></button></div>
        <div className="project-list">{projects.slice(0,4).map(p => <button key={p.id} className="project-row" onClick={() => setPage('Projects')}><div className="project-symbol" style={{background:p.color+'18',color:p.color}}><FolderKanban size={18}/></div><div className="project-info"><div className="project-name-line"><strong>{p.name}</strong><StatusPill status={p.status}/></div><div className="project-subline"><span>{p.client}</span><span>{p.done} of {p.tasks} tasks</span></div><div className="progress-track"><span style={{width:`${p.progress}%`,background:p.color}}/></div></div><div className="project-percent">{p.progress}%</div><ChevronRight size={16} className="row-chevron"/></button>)}</div>
      </section>
      <section className="panel deadlines-panel"><div className="panel-heading"><div><h3>Deadlines & attention</h3><p>What needs your eyes today</p></div><span className="panel-count">{overdue.length} overdue</span></div><div className="deadline-list">{[...overdue,...allTasks.filter(t=>dueKind(t)==='soon' && t.status!=='Done')].slice(0,4).map(t=><button className="deadline-row" key={t.id} onClick={()=>setSelectedTask(t)}><div className={`deadline-icon ${dueKind(t)==='delayed'?'danger':'warning'}`}><CalendarClock size={17}/></div><div className="deadline-copy"><strong>{t.title}</strong><small>{t.project}</small></div><div className="deadline-date"><span className={dueKind(t)==='delayed'?'red-text':''}>{dueKind(t)==='delayed'?'Overdue':`Due ${t.due}`}</span><small>{t.assignee}</small></div></button>)}{overdue.length===0 && <div className="empty-state">You're all caught up on overdue tasks.</div>}</div><button className="panel-bottom-link" onClick={()=>{setFilter('Delayed');setPage('My tasks')}}>See delayed tasks <ArrowRight size={14}/></button></section>
    </div>
    <section className="panel tasks-panel"><div className="panel-heading"><div><h3>My tasks</h3><p>Your tasks across every project, in one place</p></div><button className="text-button" onClick={()=>setPage('My tasks')}>View all tasks <ArrowRight size={14}/></button></div><TaskTable tasks={tasks.slice(0,5)} setSelectedTask={setSelectedTask}/></section>
  </>
}
function StatCard({icon:Icon,label,value,meta,tint,trend}) { return <div className="stat-card"><div className={`stat-icon ${tint}`}><Icon size={18}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-meta">{meta}</div><div className={`stat-trend ${tint}`}><span/> {trend}</div></div> }
function StatusPill({status}) { return <span className={`status-pill ${statusClass(status)}`}><i/>{status}</span> }
function TaskTable({tasks,setSelectedTask,canEdit=false,updateTask}) {
  return <div className="table-scroll"><table className="task-table"><thead><tr><th>Task name</th><th>Project</th><th>Status</th><th>Priority</th><th>Due date</th><th>Progress</th><th/></tr></thead><tbody>{tasks.map(t=><tr key={t.id}><td><button className="task-title-button" onClick={()=>setSelectedTask(t)}><span className={`task-type-dot ${t.status==='Done'?'done':''}`}>{t.status==='Done'?<Check size={11}/>:<span/>}</span><span>{t.title}<small>{t.type} · {t.comments} comments</small></span></button></td><td><span className="table-project">{t.project}</span></td><td><StatusPill status={t.status}/></td><td><span className={`priority ${t.priority.toLowerCase()}`}><i/>{t.priority}</span></td><td><span className={dueKind(t)==='delayed'?'red-text':'due-text'}>{t.due}</span></td><td><div className="table-progress"><div className="progress-track"><span style={{width:`${t.progress}%`}}/></div><small>{t.progress}%</small></div></td><td><button className="icon-button tiny" onClick={()=>setSelectedTask(t)}><ChevronRight size={15}/></button></td></tr>)}</tbody></table>{tasks.length===0 && <div className="empty-state">No tasks match your search.</div>}</div>
}
function Projects({projects,tasks,setSelectedTask,setShowNewProject,canEdit,setPage,deleteProject}) {
  return <><PageHeading eyebrow="WORKSPACE / PROJECTS" title="Projects" description="Every initiative, one connected workspace." actions={canEdit && <button className="button-primary" onClick={()=>setShowNewProject(true)}><Plus size={16}/> New project</button>}/><div className="filter-strip"><div className="filter-chip active"><FolderKanban size={14}/> All projects <span>{projects.length}</span></div><div className="filter-chip"><Activity size={14}/> Active <span>{projects.filter(p=>p.progress<100).length}</span></div><div className="filter-spacer"/><button className="button-secondary small-button"><SlidersHorizontal size={14}/> Customize view</button></div><div className="projects-grid">{projects.map(p=>{const projectTasks=tasks.filter(t=>t.projectId===p.id);return <article className="project-card" key={p.id}><div className="project-card-top"><div className="project-symbol large" style={{background:p.color+'18',color:p.color}}><FolderKanban size={20}/></div>{canEdit && <button className="icon-button tiny" title={`Delete ${p.name}`} aria-label={`Delete ${p.name}`} onClick={() => deleteProject(p.id)}><Ellipsis size={17}/></button>}</div><div className="project-card-client">{p.client}</div><h3>{p.name}</h3><div className="project-card-status"><StatusPill status={p.status}/><span><CalendarDays size={13}/> {p.due}</span></div><div className="project-card-progress"><div><span>Overall progress</span><strong>{p.progress}%</strong></div><div className="progress-track"><span style={{width:`${p.progress}%`,background:p.color}}/></div></div><div className="project-card-bottom"><div className="avatar-stack"><span className="avatar avatar-blue">AW</span><span className="avatar avatar-purple">DK</span><span className="avatar avatar-green">PM</span><span className="avatar avatar-more">+2</span></div><span>{p.done}/{p.tasks} tasks done</span></div><button className="project-card-link" onClick={()=>{setPage('My tasks')}}>Open project <ArrowRight size={15}/></button><div className="project-card-task-list">{projectTasks.slice(0,2).map(t=><button key={t.id} onClick={()=>setSelectedTask(t)}><span className="mini-task-dot"/>{t.title}<ChevronRight size={13}/></button>)}</div></article>})}</div></>
}
function TasksPage({tasks,setSelectedTask,filter,setFilter,canEdit,updateTask,setShowNewTask}) {
  const filters=['All tasks','Delayed','On track','To do','In progress','In review','Blocked','Done']
  return <><PageHeading eyebrow="WORKSPACE / TASKS" title="My tasks" description="A unified view of your work, across every project." actions={canEdit && <button className="button-primary" onClick={()=>setShowNewTask(true)}><Plus size={16}/> New task</button>}/><div className="task-toolbar"><div className="filter-tabs">{filters.map(f=><button key={f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}{f==='Delayed'&&<span className="tab-alert"/>}</button>)}</div><button className="button-secondary small-button"><Filter size={14}/> Filter</button></div><section className="panel tasks-panel full-panel"><div className="panel-heading"><div><h3>{filter}</h3><p>{tasks.length} tasks shown · Click any task for full details and history</p></div><button className="button-secondary small-button"><Download size={14}/> Export</button></div><TaskTable tasks={tasks} setSelectedTask={setSelectedTask}/></section></>
}
function Timeline({projects,tasks,setSelectedTask}) {
  return <><PageHeading eyebrow="WORKSPACE / PLANNING" title="Timeline" description="A high-level look at the work and deadlines ahead." actions={<button className="button-secondary"><CalendarDays size={15}/> October – November <ChevronDown size={14}/></button>}/><section className="panel timeline-panel"><div className="timeline-head"><div className="timeline-label-col">PROJECT / TASK</div>{['Oct 26','Oct 29','Nov 02','Nov 06','Nov 10','Nov 14','Nov 18'].map(d=><div key={d}>{d}</div>)}</div>{projects.map(p=><div className="timeline-project" key={p.id}><div className="timeline-project-label"><span style={{background:p.color}}/><strong>{p.name}</strong><small>{p.progress}%</small></div><div className="timeline-track"><div className="timeline-bar" style={{left:`${Math.max(2,100-p.progress)}%`,width:`${Math.max(14,p.progress)}%`,background:p.color+'cc'}}><span>{p.status}</span></div></div>{tasks.filter(t=>t.projectId===p.id).slice(0,2).map(t=><div className="timeline-task-row" key={t.id}><button onClick={()=>setSelectedTask(t)}>{t.title}</button><div className="timeline-task-track"><div className={`timeline-task-bar ${dueKind(t)==='delayed'?'late':''}`} style={{left:'5%',width:`${Math.max(12,t.progress)}%`}} onClick={()=>setSelectedTask(t)}><span/></div></div></div>)}</div>)}</section><div className="timeline-note"><CircleHelp size={16}/> Timeline bars are illustrative in this prototype. A production scheduler will calculate dates, dependencies and critical path from saved task data.</div></>
}
function Discussions({tasks,setSelectedTask}) {
  const withComments=tasks.filter(t=>t.discussion.length)
  return <><PageHeading eyebrow="WORKSPACE / COLLABORATION" title="Discussions" description="Keep decisions and context close to the work."/><div className="discussion-layout"><section className="panel discussion-list"><div className="panel-heading"><div><h3>Recent conversations</h3><p>Comments across your tasks</p></div></div>{withComments.map(t=><button className="discussion-task" key={t.id} onClick={()=>setSelectedTask(t)}><div className="discussion-icon"><MessageCircle size={17}/></div><div><strong>{t.title}</strong><small>{t.project}</small><p>{t.discussion[t.discussion.length-1]?.text}</p></div><span className="comment-count">{t.comments}</span></button>)}</section><section className="panel discussion-info"><div className="discussion-info-icon"><MessageCircle size={24}/></div><h3>Work moves forward in conversation.</h3><p>Open any task to review comments, reply to teammates and follow the full edit history.</p><button className="button-secondary" onClick={()=>setSelectedTask(withComments[0])}>Open latest discussion <ArrowRight size={14}/></button></section></div></>
}
function Access({role,isSuper}) {
 const [users,setUsers]=useState([]),[email,setEmail]=useState(''),[displayName,setDisplayName]=useState(''),[password,setPassword]=useState(''),[newRole,setNewRole]=useState('Client viewer'),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const [grantRole,setGrantRole]=useState('Client viewer')
 const featureNames=['Overview','Projects','My tasks','Timeline','Discussions','Team & access','Activity log','Settings','Clients Tools Access']
 const [grants,setGrants]=useState(Object.fromEntries(featureNames.map(x=>[x,x==='Settings'])))
 const invoke=async(name,data)=>{const {httpsCallable}=await import('firebase/functions');const {functions}=await import('./firebase');return httpsCallable(functions,name)(data)}
 const load=async()=>{try{const r=await invoke('listWorkspaceUsers',{});setUsers(r.data.users||[])}catch(e){setError(e.message||'Unable to load user list.')}}
 useEffect(()=>{if(isSuper)load()},[isSuper])
 const create=async e=>{e.preventDefault();setBusy(true);setError('');try{await invoke('createWorkspaceUser',{email,displayName,password,role:newRole});setEmail('');setDisplayName('');setPassword('');await load()}catch(e){setError(e.message||'Unable to create account.')}finally{setBusy(false)}}
 const update=async(uid,patch)=>{try{await invoke('updateWorkspaceUser',{uid,...patch});await load()}catch(e){setError(e.message||'Unable to update account.')}}
 const remove=async uid=>{if(!window.confirm('Permanently delete this user account?'))return;try{await invoke('deleteWorkspaceUser',{uid});await load()}catch(e){setError(e.message||'Unable to delete account.')}}
 const saveGrants=async()=>{setBusy(true);setError('');try{await invoke('setRoleFeatureGrants',{role:grantRole,features:grants});setError('Permissions saved. Existing users may need to sign out and sign in again.')}catch(e){setError(e.message||'Unable to save permissions.')}finally{setBusy(false)}}
 return <><PageHeading eyebrow="ADMINISTRATION / ACCESS" title="Team & access" description="Create accounts and manage workspace roles and feature access."/>
 {!isSuper?<p>Only the Super Admin can create accounts or change roles and feature grants.</p>:<>
 {error&&<p className="auth-alert error">{error}</p>}
 <section className="panel settings-panel"><div className="panel-heading"><div><h3>Create user account</h3><p>Accounts are provisioned by the Super Admin only. Users must change the temporary password at first login.</p></div><Plus size={18}/></div>
 <form onSubmit={create}><label>Full name<input required value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Temporary password<input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Role<select value={newRole} onChange={e=>setNewRole(e.target.value)}><option>Client viewer</option><option>Project editor</option><option>Admin</option></select></label><button className="button-primary" disabled={busy}>Create account</button></form>
 </section>
 <section className="panel settings-panel"><div className="panel-heading"><div><h3>Feature visibility by role</h3><p>Enable only the workspace areas each role should see.</p></div><ShieldCheck size={18}/></div><label>Role<select value={grantRole} onChange={e=>setGrantRole(e.target.value)}><option>Client viewer</option><option>Project editor</option><option>Admin</option></select></label>
 <div className="role-grant-grid">{featureNames.map(f=><label key={f} className="setting-row"><span>{f}</span><input type="checkbox" checked={!!grants[f]} onChange={e=>setGrants(g=>({...g,[f]:e.target.checked}))}/></label>)}</div><button className="button-primary" disabled={busy} onClick={saveGrants}>Save role permissions</button></section>
 <section className="panel access-panel"><div className="panel-heading"><div><h3>Workspace accounts</h3><p>Only approved accounts can access the workspace.</p></div><button className="button-secondary" onClick={load}>Refresh</button></div><div className="table-scroll"><table className="task-table access-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{users.map(u=><tr key={u.uid}><td>{u.displayName}<small>{u.email}</small></td><td><select value={u.role} onChange={e=>update(u.uid,{role:e.target.value})}><option>Client viewer</option><option>Project editor</option><option>Admin</option></select></td><td>{u.disabled?'Disabled':'Active'}</td><td><button className="button-secondary small-button" onClick={()=>update(u.uid,{disabled:!u.disabled})}>{u.disabled?'Enable':'Disable'}</button> <button className="button-secondary small-button" onClick={()=>remove(u.uid)}>Delete</button></td></tr>)}</tbody></table></div></section>
 </>}
 </>}
function RoleCard({icon:Icon,title,description}){return <div className="role-card"><div className="role-card-icon"><Icon size={17}/></div><strong>{title}</strong><p>{description}</p></div>}
function ActivityLog({tasks}) { const entries=tasks.flatMap(t=>t.history.map((h,i)=>({...h,task:t.title,id:`${t.id}-${i}`}))).sort((a,b)=>a.when==='Just now'?-1:1);return <><PageHeading eyebrow="WORKSPACE / TRANSPARENCY" title="Activity log" description="A readable trail of changes across your tasks." actions={<button className="button-secondary"><Download size={14}/> Export history</button>}/><section className="panel activity-panel"><div className="panel-heading"><div><h3>Recent activity</h3><p>Who changed what, and when</p></div><span className="audit-badge"><LockKeyhole size={12}/> Audit trail</span></div><div className="activity-list">{entries.map(e=><div className="activity-entry" key={e.id}><div className="activity-avatar"><History size={16}/></div><div className="activity-entry-copy"><strong>{e.who}</strong><span>{e.what}</span><small>In <b>{e.task}</b></small></div><time>{e.when}</time></div>)}</div></section></>}
function SettingsPage({role,workspaceName,setWorkspaceName,defaultTaskView,setDefaultTaskView,weeklyDigest,setWeeklyDigest,setToast,user,preferredName,setPreferredName}) {
 const [name,setName]=useState(preferredName||user?.displayName||''),[password,setPassword]=useState('')
 const saveName=async()=>{try{const {updateProfile}=await import('firebase/auth');await updateProfile(auth.currentUser,{displayName:name.trim()});setPreferredName(name.trim());setToast('Preferred name updated. Your greeting is ready to shine.')}catch{setToast('Unable to update display name.')}}
 const changePassword=async()=>{try{const {httpsCallable}=await import('firebase/functions');const {functions}=await import('./firebase');await httpsCallable(functions,'changeOwnPassword')({password});setPassword('');setToast('Password updated.')}catch(e){setToast(e.message||'Password update failed.')}}
 return <><PageHeading eyebrow="ACCOUNT / SECURITY" title="Settings" description="Manage your account details and security."/>
 <div className="settings-grid"><section className="panel settings-panel"><div className="panel-heading"><div><h3>Your account</h3><p>Your email and assigned role are managed by the Super Admin.</p></div><ShieldCheck size={18}/></div>
 <label className="setting-row"><span><strong>Email address</strong><small>Read-only account identifier</small></span><input value={user?.email||''} readOnly/></label>
 <label className="setting-row"><span><strong>Workspace role</strong><small>Contact a Super Admin to change your role</small></span><input value={role} readOnly/></label>
 <label className="setting-row"><span><strong>Preferred name</strong><small>We’ll use this in your personalized workspace greeting</small></span><input value={name} onChange={e=>setName(e.target.value)} maxLength={100}/></label>
 <div className="settings-save"><button className="button-primary" onClick={saveName}>Save preferred name</button></div>
 <label className="setting-row"><span><strong>New password</strong><small>At least 6 characters</small></span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} placeholder="Enter a new password"/></label>
 <div className="settings-save"><button className="button-primary" disabled={password.length<6} onClick={changePassword}>Change password</button><button className="button-secondary" onClick={()=>signOut(auth)}>Log out</button></div>
 </section>
 {role==='Centric super admin'&&<section className="panel settings-panel"><div className="panel-heading"><div><h3>Workspace preferences</h3><p>Saved in this browser in the current prototype.</p></div><Settings size={18}/></div>
 <label className="setting-row"><span><strong>Workspace name</strong></span><input value={workspaceName} onChange={e=>setWorkspaceName(e.target.value)} maxLength={80}/></label>
 <label className="setting-row"><span><strong>Default task view</strong></span><select value={defaultTaskView} onChange={e=>setDefaultTaskView(e.target.value)}><option>Overview</option><option>My tasks</option><option>Projects</option></select></label>
 <label className="setting-row"><span><strong>Weekly digest</strong><small>Email delivery is not connected yet</small></span><input type="checkbox" checked={weeklyDigest} onChange={e=>setWeeklyDigest(e.target.checked)}/></label>
 <div className="settings-save"><button className="button-primary" onClick={()=>setToast('Preferences saved in this browser.')}>Save preferences</button></div></section>}</div></>}

function NotificationsPage({notifications,setNotifications}) {return <><PageHeading eyebrow="WORKSPACE / UPDATES" title="Notifications" description="Reminders, task changes and completion updates." actions={<button className="button-secondary" onClick={()=>setNotifications(ns=>ns.map(n=>({...n,unread:false})))}><CheckCheck size={15}/> Mark all read</button>}/><section className="panel notification-center">{notifications.map(n=><div className={`notification-center-row ${n.unread?'unread':''}`} key={n.id}><div className="notification-icon"><n.icon size={17}/></div><div><strong>{n.title}</strong><p>{n.body}</p><small>{n.time}</small></div><button className="text-button" onClick={()=>setNotifications(ns=>ns.map(x=>x.id===n.id?{...x,unread:!x.unread}:x))}>{n.unread?'Mark read':'Mark unread'}</button></div>)}</section></>}
function HelpPage(){return <><PageHeading eyebrow="CENTRIC NEXUS / HELP" title="Welcome to your workspace" description="A few basics to help you get moving."/><div className="role-cards help-cards"><RoleCard icon={LayoutDashboard} title="Start with Overview" description="Get a quick view of active projects, progress, overdue work and upcoming deadlines."/><RoleCard icon={ListTodo} title="Open any task" description="Review task details, status, priority, comments and a chronological change history."/><RoleCard icon={Users} title="Manage access" description="Admins assign project members and choose viewer, editor, admin or super-admin access."/><RoleCard icon={Bell} title="Stay in the loop" description="Use notifications to keep up with reminders, comments, changes and completions."/></div></>}
function TaskDrawer({task,onClose,canEdit,updateTask,commentDraft,setCommentDraft,addComment}) {
  const [tab,setTab]=useState('Discussion')
  return <><div className="drawer-backdrop" onClick={onClose}/><aside className="task-drawer"><div className="drawer-top"><div className="drawer-breadcrumb"><span>{task.project}</span><ChevronRight size={13}/><span>Task details</span></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div><div className="drawer-content"><div className="task-kind-label"><span className="task-kind-dot"/>{task.type.toUpperCase()} <span className="dot-separator">•</span> CN-{task.id}</div><h2>{task.title}</h2><p className="drawer-description">Keep this task moving by tracking progress, discussing updates and making decisions visible to everyone involved.</p><div className="drawer-status-row"><label><span>Status</span><select value={task.status} disabled={!canEdit} onChange={e=>updateTask(task.id,{status:e.target.value,progress:e.target.value==='Done'?100:task.progress})}><option>To do</option><option>In progress</option><option>In review</option><option>Blocked</option><option>Done</option></select></label><label><span>Priority</span><select value={task.priority} disabled={!canEdit} onChange={e=>updateTask(task.id,{priority:e.target.value})}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label></div><div className="drawer-properties"><Property icon={Users} label="Assignee" value={task.assignee}/><Property icon={FolderKanban} label="Project" value={task.project}/><Property icon={CalendarDays} label="Due date" value={task.due}/><Property icon={Gauge} label="Progress" value={`${task.progress}%`}/></div><div className="drawer-progress"><div><span>Task completion</span><strong>{task.progress}%</strong></div><div className="progress-track"><span style={{width:`${task.progress}%`}}/></div>{canEdit&&<input aria-label="Task progress" type="range" min="0" max="100" step="5" value={task.progress} onChange={e=>updateTask(task.id,{progress:Number(e.target.value)})}/>}</div><div className="drawer-tabs"><button className={tab==='Discussion'?'active':''} onClick={()=>setTab('Discussion')}><MessageCircle size={15}/> Discussion <span>{task.comments}</span></button><button className={tab==='History'?'active':''} onClick={()=>setTab('History')}><History size={15}/> History <span>{task.history.length}</span></button><button className={tab==='Files'?'active':''} onClick={()=>setTab('Files')}><Paperclip size={15}/> Files</button></div>
    {tab==='Discussion'&&<div className="drawer-discussion">{task.discussion.length?task.discussion.map((c,i)=><div className="comment" key={i}><div className={`avatar ${c.initials==='AW'?'avatar-purple':c.initials==='DK'?'avatar-green':'avatar-blue'}`}>{c.initials}</div><div className="comment-main"><div className="comment-meta"><strong>{c.who}</strong><time>{c.time}</time></div><p>{c.text}</p></div></div>):<div className="empty-state">No comments yet. Start the conversation.</div>}<div className="comment-composer"><div className="avatar avatar-blue">YO</div><div className="composer-input"><textarea value={commentDraft} onChange={e=>setCommentDraft(e.target.value)} placeholder="Write a comment or use @ to mention..." rows="2"/><div className="composer-actions"><button className="icon-button tiny" title="Attach file"><Paperclip size={15}/></button><button className="button-primary send-button" onClick={addComment} disabled={!commentDraft.trim()}><Send size={14}/> Send</button></div></div></div></div>}
    {tab==='History'&&<div className="drawer-history">{task.history.map((h,i)=><div className="history-item" key={i}><div className="history-marker"><History size={13}/></div><div><strong>{h.who}</strong><p>{h.what}</p><small>{h.when}</small></div></div>)}</div>}
    {tab==='Files'&&<div className="files-empty"><div><Paperclip size={22}/></div><strong>No files attached yet</strong><p>Attach design files, briefs and other deliverables to keep project context together.</p><button className="button-secondary" onClick={()=>alert('File uploads will be added with backend storage.')}>Attach a file</button></div>}
    <div className="drawer-footer"><span><LockKeyhole size={13}/> Visible to project members</span><button className="text-button" onClick={()=>setTab('History')}>View full history <ArrowRight size={13}/></button></div></div></aside></>
}
function Property({icon:Icon,label,value}){return <div className="property-row"><div><Icon size={15}/><span>{label}</span></div><strong>{value}</strong></div>}
function Modal({title,subtitle,onClose,children}) {return <div className="modal-backdrop" onClick={onClose}><section className="modal" onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose}><X size={18}/></button></div>{children}</section></div>}

function App() {
  const [user, setUser] = useState(undefined)
  useEffect(() => onAuthStateChanged(auth, async currentUser => {
    if (!currentUser) { setUser(null); return }
    try {
      const result = await currentUser.getIdTokenResult(true)
      const claims = result.claims
      if (claims.superAdmin !== true && !['Client viewer','Project editor','Admin'].includes(claims.role)) {
        await signOut(auth); setUser(null); return
      }
      setUser({...currentUser, role:claims.superAdmin===true?'Centric super admin':claims.role, superAdmin:claims.superAdmin===true, features:claims.features||{}, mustChangePassword:claims.mustChangePassword===true})
    } catch { await signOut(auth); setUser(null) }
  }), [])
  if (user === undefined) return <div className="auth-loading" role="status">Loading your secure session…</div>
  if (!user) return <AuthGate />
  if (user.mustChangePassword) return <ForcePasswordChange />
  return <WorkspaceApp user={user} />
}
function ForcePasswordChange(){
 const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{const {httpsCallable}=await import('firebase/functions');const {functions}=await import('./firebase');await httpsCallable(functions,'changeOwnPassword')({password});await auth.currentUser.getIdToken(true);window.location.reload()}catch(e){setError(e.message||'Password change failed.')}finally{setBusy(false)}}
 return <main className="auth-screen"><form className="auth-card" onSubmit={submit}><h1>Change your temporary password</h1><p className="auth-subtitle">Set a new password before entering Centric Nexus. Use at least 6 characters.</p><label>New password<input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="auth-alert error">{error}</p>}<button className="auth-submit" disabled={busy}>{busy?'Updating…':'Update password'}</button><button type="button" className="forgot-link" onClick={()=>signOut(auth)}>Sign out</button></form></main>
}

createRoot(document.getElementById('root')).render(<App />)
