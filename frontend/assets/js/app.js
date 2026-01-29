
(function(){
  const $ = (id)=>document.getElementById(id);

  const els = {
    fullName: $("fullName"),
    email: $("email"),
    password: $("password"),
    registerBtn: $("registerBtn"),
    loginSubmitBtn: $("loginSubmitBtn"),
    loginBtn: $("loginBtn"),
    logoutBtn: $("logoutBtn"),
    authState: $("authState"),

    studentName: $("studentName"),
    institution: $("institution"),
    department: $("department"),
    level: $("level"),
    scale: $("scale"),
    matric: $("matric"),
    semesterName: $("semesterName"),

    course: $("course"),
    units: $("units"),
    grade: $("grade"),
    addCourseBtn: $("addCourseBtn"),
    clearCoursesBtn: $("clearCoursesBtn"),

    coursesBody: $("coursesBody"),
    gpa: $("gpa"),
    cgpa: $("cgpa"),
    totalUnits: $("totalUnits"),
    classify: $("classify"),

    newSemesterBtn: $("newSemesterBtn"),
    saveSemesterBtn: $("saveSemesterBtn"),
    downloadPdfBtn: $("downloadPdfBtn"),

    planBadge: $("planBadge"),
    payBtn: $("payBtn"),
    restoreBtn: $("restoreBtn"),

    targetClass: $("targetClass"),
    forecastText: $("forecastText"),
    validationHint: $("validationHint"),
    proTag: $("proTag"),
    upgradePill: $("upgradePill")
  };

  const LS_PROFILE = "pisgah_profile";
  const LS_DATA = "pisgah_data_v1";

  let state = {
    courses: [],
    semesters: [],
    isPro: false,
    proExpiresAt: null
  };

  function loadLocal(){
    const profRaw = localStorage.getItem(LS_PROFILE);
    if(profRaw){
      try{
        const p = JSON.parse(profRaw);
        els.studentName.value = p.studentName || "";
        els.institution.value = p.institution || "";
        els.department.value = p.department || "";
        els.level.value = p.level || "100L";
        els.scale.value = p.scale || "5";
        els.matric.value = p.matric || "";
      }catch{}
    }

    const dataRaw = localStorage.getItem(LS_DATA);
    if(dataRaw){
      try{
        const d = JSON.parse(dataRaw);
        state.semesters = d.semesters || [];
        state.proExpiresAt = d.proExpiresAt || null;
        state.isPro = !!(state.proExpiresAt && new Date(state.proExpiresAt).getTime() > Date.now());
      }catch{}
    }
  }

  function saveLocal(){
    const profile = {
      studentName: els.studentName.value.trim(),
      institution: els.institution.value.trim(),
      department: els.department.value.trim(),
      level: els.level.value,
      scale: els.scale.value,
      matric: els.matric.value.trim()
    };
    localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
    localStorage.setItem(LS_DATA, JSON.stringify({
      semesters: state.semesters,
      proExpiresAt: state.proExpiresAt
    }));
  }

  function gpMap(scale){
    // basic mapping; you can adjust per institution.
    if(scale === 4){
      return { A:4, B:3, C:2, D:1, E:0, F:0 };
    }
    return { A:5, B:4, C:3, D:2, E:1, F:0 };
  }

  function classifyFromCgpa(cgpa, scale){
    if(scale === 4){
      if(cgpa >= 3.5) return "First Class";
      if(cgpa >= 3.0) return "Second Class Upper (2:1)";
      if(cgpa >= 2.0) return "Second Class Lower (2:2)";
      if(cgpa >= 1.0) return "Third Class";
      return "Pass";
    }
    if(cgpa >= 4.5) return "First Class";
    if(cgpa >= 3.5) return "Second Class Upper (2:1)";
    if(cgpa >= 2.4) return "Second Class Lower (2:2)";
    if(cgpa >= 1.5) return "Third Class";
    return "Pass";
  }

  function compute(){
    const scale = parseInt(els.scale.value, 10);
    const map = gpMap(scale);
    let totalU = 0;
    let totalQP = 0;

    state.courses.forEach(c=>{
      totalU += c.units;
      totalQP += c.units * (map[c.grade] ?? 0);
    });

    const gpa = totalU ? (totalQP / totalU) : 0;

    // CGPA across saved semesters + current semester draft
    let cumU = 0;
    let cumQP = 0;

    for(const sem of state.semesters){
      cumU += sem.totalUnits;
      cumQP += sem.totalQualityPoints;
    }
    cumU += totalU;
    cumQP += totalQP;

    const cgpa = cumU ? (cumQP / cumU) : 0;

    els.totalUnits.textContent = String(totalU);
    els.gpa.textContent = gpa.toFixed(2);
    els.cgpa.textContent = cgpa.toFixed(2);
    els.classify.textContent = totalU ? classifyFromCgpa(cgpa, scale) : "—";

    updateForecast(cgpa, scale);
  }

  function render(){
    els.coursesBody.innerHTML = "";
    const scale = parseInt(els.scale.value, 10);
    const map = gpMap(scale);

    state.courses.forEach((c, idx)=>{
      const gp = map[c.grade] ?? 0;
      const qp = gp * c.units;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(c.title)}</td>
        <td>${c.units}</td>
        <td>${c.grade}</td>
        <td>${gp}</td>
        <td>${qp}</td>
        <td><button class="btn danger" data-del="${idx}" style="padding:8px 10px">Remove</button></td>
      `;
      els.coursesBody.appendChild(tr);
    });

    els.coursesBody.querySelectorAll("button[data-del]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const i = parseInt(btn.getAttribute("data-del"),10);
        state.courses.splice(i,1);
        compute(); render(); saveLocal();
      });
    });
  }

  function escapeHtml(str){
    return (str||"").replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  }

  function hint(msg){ els.validationHint.textContent = msg || ""; }

  function addCourse(){
    const title = els.course.value.trim();
    const units = parseInt(els.units.value, 10);
    const grade = els.grade.value;

    if(!title || !units || units < 0){
      hint("Add a valid course and units. We can’t calculate GPA with vibes.");
      return;
    }
    hint("");

    state.courses.push({ title, units, grade });
    els.course.value = "";
    els.units.value = "";
    els.grade.value = "A";

    compute(); render(); saveLocal();
  }

  function clearCourses(){
    state.courses = [];
    compute(); render(); saveLocal();
  }

  function newSemester(){
    state.courses = [];
    els.semesterName.value = "";
    compute(); render(); saveLocal();
    hint("New semester started.");
    setTimeout(()=>hint(""), 1800);
  }

  function saveSemester(){
    const label = els.semesterName.value.trim() || "Unnamed semester";
    const scale = parseInt(els.scale.value, 10);
    const map = gpMap(scale);

    if(state.courses.length === 0){
      hint("Add at least one course before saving a semester.");
      return;
    }

    // Free tier limit
    if(!state.isPro && state.semesters.length >= 1){
      hint("Free plan allows 1 saved semester. Upgrade to Pro for unlimited semesters.");
      window.location.hash = "upgrade";
      return;
    }

    let totalUnits = 0;
    let totalQP = 0;
    state.courses.forEach(c=>{
      totalUnits += c.units;
      totalQP += c.units * (map[c.grade] ?? 0);
    });

    const gpa = totalUnits ? totalQP/totalUnits : 0;

    state.semesters.push({
      label,
      createdAt: new Date().toISOString(),
      courses: [...state.courses],
      totalUnits,
      totalQualityPoints: totalQP,
      gpa
    });

    saveLocal();
    compute();
    hint(`Saved: ${label}`);
    setTimeout(()=>hint(""), 2000);
  }

  function setPlanUI(){
    els.planBadge.textContent = state.isPro ? "Pro" : "Free";
    els.planBadge.style.borderColor = state.isPro ? "rgba(217,178,95,.55)" : "rgba(255,255,255,.12)";
    els.proTag.style.display = state.isPro ? "none" : "inline-flex";
    els.upgradePill.style.display = state.isPro ? "none" : "inline-flex";
  }

  function updateForecast(currentCgpa, scale){
    if(!state.isPro){
      els.forecastText.textContent = "Upgrade to Pro to use forecasting.";
      return;
    }
    const target = els.targetClass.value;

    // Minimum CGPA thresholds (approx, can be customized)
    const thresholds = (scale === 4)
      ? { first: 3.5, "21": 3.0, "22": 2.0, third: 1.0 }
      : { first: 4.5, "21": 3.5, "22": 2.4, third: 1.5 };

    const need = thresholds[target];
    const gap = need - currentCgpa;

    if(currentCgpa >= need){
      els.forecastText.textContent = `You’re currently on track for your target. Keep it steady.`;
    } else {
      els.forecastText.textContent = `Target needs ~${need.toFixed(2)} CGPA. You’re ${gap.toFixed(2)} points away. Focus on high-unit courses.`;
    }
  }

  async function restoreMe(){
    const token = Auth.getToken();
    if(!token) return;
    try{
      const me = await Auth.me();
      state.isPro = !!me.isPro;
      state.proExpiresAt = me.proExpiresAt || null;
      setPlanUI();
      setLoggedInUI(true, me);
      hint(state.isPro ? "Pro active." : "Logged in.");
      setTimeout(()=>hint(""), 1500);
    }catch(e){
      // token stale
      Auth.clearToken();
      setLoggedInUI(false);
      state.isPro = false;
      state.proExpiresAt = null;
      setPlanUI();
    }
  }

  function setLoggedInUI(isIn, user){
    els.loginBtn.style.display = isIn ? "none" : "inline-flex";
    els.logoutBtn.style.display = isIn ? "inline-flex" : "none";
    if(isIn){
      els.authState.style.display = "block";
      els.authState.textContent = `Signed in as ${user?.email || "user"}${(user?.isPro ? " • Pro" : "")}`;
    } else {
      els.authState.style.display = "none";
      els.authState.textContent = "";
    }
  }

  async function doRegister(){
    try{
      const fullName = els.fullName.value.trim();
      const email = els.email.value.trim();
      const password = els.password.value;
      if(!fullName || !email || password.length < 6){
        Pay.toast("Enter full name, email, and a password (min 6 chars).");
        return;
      }
      const u = await Auth.register({ fullName, email, password });
      state.isPro = !!u.isPro;
      state.proExpiresAt = u.proExpiresAt || null;
      setPlanUI();
      setLoggedInUI(true, u);
      Pay.toast("Account created. Welcome to Pisgah.");
    }catch(e){
      Pay.toast(e.message);
    }
  }

  async function doLogin(){
    try{
      const email = els.email.value.trim();
      const password = els.password.value;
      if(!email || !password){
        Pay.toast("Enter your email and password.");
        return;
      }
      const u = await Auth.login({ email, password });
      state.isPro = !!u.isPro;
      state.proExpiresAt = u.proExpiresAt || null;
      setPlanUI();
      setLoggedInUI(true, u);
      Pay.toast("Logged in.");
    }catch(e){
      Pay.toast(e.message);
    }
  }

  async function doLogout(){
    Auth.clearToken();
    state.isPro = false;
    state.proExpiresAt = null;
    setPlanUI();
    setLoggedInUI(false);
    Pay.toast("Logged out.");
  }

  function downloadPdf(){
    const { jsPDF } = window.jspdf;
    if(!jsPDF){
      Pay.toast("jsPDF failed to load. Check your internet connection.");
      return;
    }

    const profile = {
      studentName: els.studentName.value.trim(),
      institution: els.institution.value.trim(),
      department: els.department.value.trim(),
      level: els.level.value,
      scale: els.scale.value,
      matric: els.matric.value.trim(),
      semesterLabel: els.semesterName.value.trim() || "Semester"
    };

    if(!profile.studentName){
      hint("Add student name before downloading a report.");
      return;
    }
    if(state.courses.length === 0){
      hint("Add at least one course before downloading a report.");
      return;
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 44;

    const today = new Date();
    const dateStr = today.toLocaleDateString(undefined, { year:"numeric", month:"long", day:"numeric" });

    // Header
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.text("PISGAH", margin, 56);

    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.text("Academic Planning Platform", margin, 74);

    doc.setFont("times","italic");
    doc.setFontSize(11);
    doc.text("Chart Your Path to Success", margin, 92);

    doc.setDrawColor(217,178,95);
    doc.setLineWidth(1);
    doc.line(margin, 102, pageW - margin, 102);

    // Meta
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const meta = [
      ["Student", profile.studentName],
      ["Matric No.", profile.matric || "—"],
      ["Institution", profile.institution || "—"],
      ["Department", profile.department || "—"],
      ["Level", profile.level],
      ["Semester", profile.semesterLabel],
      ["Generated", dateStr]
    ];

    let y = 128;
    meta.forEach(([k,v])=>{
      doc.setTextColor(170,180,214);
      doc.text(`${k}:`, margin, y);
      doc.setTextColor(238,241,255);
      doc.text(String(v), margin + 86, y);
      y += 16;
    });

    // Summary
    const gpa = parseFloat(els.gpa.textContent || "0");
    const cgpa = parseFloat(els.cgpa.textContent || "0");
    const totalUnits = parseInt(els.totalUnits.textContent || "0", 10);
    const classification = els.classify.textContent || "—";

    y += 10;
    doc.setDrawColor(255,255,255);
    doc.setLineWidth(.5);
    doc.line(margin, y, pageW - margin, y);
    y += 18;

    doc.setTextColor(238,241,255);
    doc.setFont("helvetica","bold");
    doc.text(`Semester Outcome`, margin, y);
    y += 16;

    doc.setFont("helvetica","normal");
    doc.setTextColor(170,180,214);
    doc.text(`GPA:`, margin, y);
    doc.setTextColor(238,241,255);
    doc.text(gpa.toFixed(2), margin + 40, y);

    doc.setTextColor(170,180,214);
    doc.text(`Total Units:`, margin + 110, y);
    doc.setTextColor(238,241,255);
    doc.text(String(totalUnits), margin + 178, y);

    doc.setTextColor(170,180,214);
    doc.text(`CGPA:`, margin + 250, y);
    doc.setTextColor(238,241,255);
    doc.text(cgpa.toFixed(2), margin + 292, y);

    y += 16;
    doc.setTextColor(170,180,214);
    doc.text(`Classification:`, margin, y);
    doc.setTextColor(238,241,255);
    doc.text(classification, margin + 86, y);

    // Table header
    y += 26;
    const col = [margin, margin+260, margin+310, margin+350, margin+430];
    doc.setFont("helvetica","bold");
    doc.setTextColor(170,180,214);
    doc.text("Course", col[0], y);
    doc.text("Units", col[1], y);
    doc.text("Grade", col[2], y);
    doc.text("GP", col[3], y);
    doc.text("Quality Pts", col[4], y);
    y += 10;
    doc.setDrawColor(255,255,255);
    doc.line(margin, y, pageW - margin, y);

    // Rows with pagination
    const scaleInt = parseInt(els.scale.value, 10);
    const map = gpMap(scaleInt);

    doc.setFont("helvetica","normal");
    doc.setTextColor(238,241,255);

    y += 18;
    const rowH = 16;
    for(const c of state.courses){
      if(y > pageH - 84){
        footer(doc, pageW, pageH, margin);
        doc.addPage();
        y = 56;
        doc.setFont("helvetica","bold");
        doc.setTextColor(170,180,214);
        doc.text("Courses (continued)", margin, y);
        y += 18;
        doc.setDrawColor(255,255,255);
        doc.line(margin, y, pageW - margin, y);
        y += 18;
        doc.setFont("helvetica","normal");
        doc.setTextColor(238,241,255);
      }
      const gp = map[c.grade] ?? 0;
      const qp = gp * c.units;
      const courseLines = doc.splitTextToSize(c.title, 250);
      doc.text(courseLines, col[0], y);
      doc.text(String(c.units), col[1], y);
      doc.text(String(c.grade), col[2], y);
      doc.text(String(gp), col[3], y);
      doc.text(String(qp), col[4], y);

      y += rowH + (courseLines.length-1)*12;
    }

    // Footer + disclaimer
    footer(doc, pageW, pageH, margin);

    doc.save(`Pisgah_Academic_Summary_${profile.studentName.replace(/\s+/g,"_")}.pdf`);
  }

  function footer(doc, pageW, pageH, margin){
    doc.setFont("helvetica","italic");
    doc.setFontSize(9);
    doc.setTextColor(170,180,214);
    doc.text("Unofficial Academic Summary — For Planning & Advisory Purposes Only", margin, pageH - 44);
    doc.text("Pisgah • Chart Your Path to Success", margin, pageH - 30);
  }

  async function upgrade(){
    const user = Auth.getUser();
    if(!user?.email){
      Pay.toast("Please login before upgrading.");
      return;
    }
    Pay.startPayment({
      email: user.email,
      amountNgn: window.PISGAH_CONFIG.PRO_PRICE_NGN,
      onSuccess: async (reference)=>{
        try{
          Pay.toast("Verifying payment…");
          const v = await Pay.verify(reference);
          // backend returns updated user
          state.isPro = !!v.user.isPro;
          state.proExpiresAt = v.user.proExpiresAt || null;
          setPlanUI();
          setLoggedInUI(true, v.user);
          Pay.toast("Pro activated. Go forth and plan like a genius.");
        }catch(e){
          Pay.toast(e.message);
        }
      },
      onClose: ()=> Pay.toast("Payment closed.")
    });
  }

  async function restore(){
    await restoreMe();
  }

  function bind(){
    els.registerBtn.addEventListener("click", doRegister);
    els.loginSubmitBtn.addEventListener("click", doLogin);
    els.loginBtn.addEventListener("click", ()=>{ document.getElementById("email").focus(); });
    els.logoutBtn.addEventListener("click", doLogout);

    els.addCourseBtn.addEventListener("click", addCourse);
    els.clearCoursesBtn.addEventListener("click", clearCourses);
    els.newSemesterBtn.addEventListener("click", newSemester);
    els.saveSemesterBtn.addEventListener("click", saveSemester);
    els.downloadPdfBtn.addEventListener("click", downloadPdf);

    ["studentName","institution","department","level","scale","matric","semesterName"].forEach(id=>{
      $(id).addEventListener("input", ()=>{ saveLocal(); compute(); });
      $(id).addEventListener("change", ()=>{ saveLocal(); compute(); render(); });
    });

    els.targetClass.addEventListener("change", ()=> compute());

    els.payBtn.addEventListener("click", upgrade);
    els.restoreBtn.addEventListener("click", restore);
  }

  // init
  loadLocal();
  bind();
  compute();
  render();
  setPlanUI();
  restoreMe();
})();
