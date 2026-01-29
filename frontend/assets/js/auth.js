
const Auth = (() => {
  const LS_TOKEN = "pisgah_token";
  const LS_USER = "pisgah_user";

  function getToken(){ return localStorage.getItem(LS_TOKEN) || ""; }
  function setToken(t){ localStorage.setItem(LS_TOKEN, t); }
  function clearToken(){ localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_USER); }

  function getUser(){
    const raw = localStorage.getItem(LS_USER);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function setUser(u){ localStorage.setItem(LS_USER, JSON.stringify(u)); }

  async function api(path, opts={}){
    const headers = Object.assign({ "Content-Type":"application/json" }, opts.headers||{});
    const token = getToken();
    if(token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${window.PISGAH_CONFIG.API_BASE}${path}`, { ...opts, headers });
    const data = await res.json().catch(()=> ({}));
    if(!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function register({ fullName, email, password }){
    const data = await api("/api/auth/register", {
      method:"POST",
      body: JSON.stringify({ fullName, email, password })
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function login({ email, password }){
    const data = await api("/api/auth/login", {
      method:"POST",
      body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function me(){
    const data = await api("/api/me", { method:"GET" });
    setUser(data.user);
    return data.user;
  }

  return { getToken, setToken, clearToken, getUser, register, login, me, api };
})();
