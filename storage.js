/* DIGIgyde browser storage layer. Data remains in this browser. */
(function(){
  const KEY="digigyde_frontend_v1";
  const now=()=>new Date().toISOString();
  const makeId=()=>{try{return "DGY-"+(crypto.randomUUID?crypto.randomUUID().replace(/-/g,"").slice(0,14).toUpperCase():Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,8).toUpperCase())}catch(e){return "DGY-"+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,8).toUpperCase()}};
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}};
  const write=data=>localStorage.setItem(KEY,JSON.stringify(data));
  function seed(){
    if(localStorage.getItem(KEY)!==null){if(read())return;return;}
    const data={
      users:[
        {id:"admin-001",name:"DIGIgyde Administrator",email:"admin@digigyde.local",password:"Admin123!",role:"admin",status:"Active",createdAt:now(),phone:"",address:"Barangay Hall"},
        {id:"resident-001",name:"Alex Santos",email:"resident@digigyde.local",password:"Resident123!",role:"resident",status:"Active",createdAt:now(),phone:"09171234567",address:"Sample Street, Barangay"},
        {id:"resident-002",name:"Jamie Reyes",email:"jamie@example.local",password:"Resident123!",role:"resident",status:"Active",createdAt:now(),phone:"",address:""}
      ],
      requests:[
        {id:"DGY-1001",userId:"resident-001",residentName:"Alex Santos",service:"Barangay Clearance",purpose:"Employment requirement",details:"Sample request.",status:"Processing",createdAt:now(),updatedAt:now(),adminNote:"Under review"},
        {id:"DGY-1002",userId:"resident-002",residentName:"Jamie Reyes",service:"Certificate of Residency",purpose:"School requirement",details:"Sample request.",status:"Pending",createdAt:now(),updatedAt:now(),adminNote:""}
      ],
      announcements:[
        {id:"ann-1",title:"Welcome to DIGIgyde",body:"Explore the digital community services portal and learn how to submit and track requests.",date:now(),active:true},
        {id:"ann-2",title:"Prepare your requirements",body:"Please review each service's requirements before submitting a request.",date:now(),active:true}
      ],
      notifications:[],
      audit:[{id:"audit-1",actor:"System",action:"Initial data initialized",target:"Application",date:now()}]
    };
    write(data);
  }
  function get(){seed();const d=read()||{users:[],requests:[],announcements:[],notifications:[],audit:[]};let changed=false;for(const r of d.requests||[]){const map={Submitted:"Pending",Draft:"Pending","Under Review":"Processing",Approved:"Completed",Rejected:"Action Required"};if(map[r.status]){r.status=map[r.status];changed=true}if(!Array.isArray(r.statusHistory))r.statusHistory=[];}if(changed)write(d);return d}
  function set(data){write(data)}
  function addAudit(actor,action,target){const d=get();d.audit.unshift({id:"audit-"+Date.now(),actor,action,target,date:now()});d.audit=d.audit.slice(0,150);set(d)}
  window.DigiStore={
    get, set, addAudit,
    current(){return sessionStorage.getItem("digigyde_session")||""},
    session(id){if(id)sessionStorage.setItem("digigyde_session",id);else sessionStorage.removeItem("digigyde_session")},
    user(){const id=this.current();return get().users.find(u=>u.id===id)||null},
    signIn(email,password,role){const d=get();const u=d.users.find(x=>x.email.toLowerCase()===email.trim().toLowerCase()&&x.password===password&&x.role===role&&x.status==="Active");if(!u)return {error:"Those details did not match an active "+role+" account."};this.session(u.id);addAudit(u.name,"Signed in",u.role+" portal");return {user:u}},
    register(form){const d=get();if(d.users.some(u=>u.email.toLowerCase()===form.email.trim().toLowerCase()))return {error:"An account with this email already exists."};const u={id:"user-"+Date.now(),name:form.name.trim(),email:form.email.trim().toLowerCase(),password:form.password,role:"resident",status:"Active",phone:form.phone.trim(),address:form.address.trim(),birthDate:form.birthDate||"",gender:form.gender||"",createdAt:now()};d.users.push(u);d.notifications.push({id:"n-"+Date.now(),userId:u.id,title:"Welcome to DIGIgyde",body:"Your DIGIgyde account has been created.",date:now(),read:false});set(d);addAudit(u.name,"Registered account",u.email);this.session(u.id);return {user:u}},
    createRequest(form){const u=this.user();if(!u)throw new Error("No active local session");const d=get();let id=makeId();while(d.requests.some(x=>x.id===id))id=makeId();const stamp=now();const r={id,userId:u.id,residentName:u.name,service:form.service,purpose:form.purpose,details:form.details,status:"Pending",createdAt:stamp,updatedAt:stamp,adminNote:"",statusHistory:[{status:"Pending",date:stamp,note:"Request submitted by resident."}]};d.requests.unshift(r);d.notifications.unshift({id:"n-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),userId:u.id,title:"Request submitted",body:"Your "+r.service+" request ("+r.id+") was submitted.",date:stamp,read:false,targetRequestId:r.id});set(d);addAudit(u.name,"Submitted request",r.id);return r},
    updateRequest(id,status,note){const d=get(),r=d.requests.find(x=>x.id===id);if(!r)return false;const aliases={Draft:"Pending",Submitted:"Pending","Under Review":"Processing"};status=aliases[status]||status;const allowed=["Pending","Processing","Action Required","Completed"];if(!allowed.includes(status))return false;const order={Pending:0,Processing:1,"Action Required":2,Completed:3};const stamp=now(),oldStatus=aliases[r.status]||r.status;if(oldStatus==="Completed"&&status!=="Completed")return false;if(order[status]<order[oldStatus]&&status!=="Rejected")return false;if(status==="Completed"&&oldStatus!=="Processing"&&oldStatus!=="Action Required"&&oldStatus!=="Completed")return false;r.status=status;r.adminNote=note||"";r.updatedAt=stamp;if(!Array.isArray(r.statusHistory))r.statusHistory=[];if(oldStatus!==status||note)r.statusHistory.push({status,date:stamp,note:note||""});if(status==="Action Required"&&r.attachmentMeta)r.attachmentMeta.status="Needs Replacement";if(status==="Completed"){if(r.attachmentMeta&&r.attachmentMeta.status==="Submitted — Pending Review")r.attachmentMeta.status="Reviewed by Demo Admin";}d.notifications.unshift({id:"n-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),userId:r.userId,title:"Request status updated",body:"Your "+r.service+" request ("+r.id+") status is now "+status+".",date:stamp,read:false,targetRequestId:r.id});set(d);addAudit(this.user()?.name||"Administrator","Updated request",id+" → "+status);return true},
    updateResidentRequest(id,changes){const actor=this.user();if(!actor||actor.role!=="resident")return false;const d=get(),r=d.requests.find(x=>x.id===id&&x.userId===actor.id);if(!r)return false;const stamp=now();r.purpose=String(changes.purpose||"");r.details=String(changes.details||"");r.applicantInfo=changes.applicantInfo||r.applicantInfo||{};r.serviceData=changes.serviceData||r.serviceData||{};r.checklist=Array.isArray(changes.checklist)?changes.checklist:(r.checklist||[]);r.attachmentMeta=changes.attachmentMeta===undefined?(r.attachmentMeta||null):changes.attachmentMeta;if(changes.preferredResponse)r.preferredResponse=changes.preferredResponse;r.updatedAt=stamp;if(!Array.isArray(r.statusHistory))r.statusHistory=[];r.statusHistory.push({status:r.status,date:stamp,note:"Resident edited request details."});d.notifications.unshift({id:"n-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),userId:actor.id,title:"Request updated",body:"Your request ("+r.id+") details were updated.",date:stamp,read:false,targetRequestId:r.id});set(d);addAudit(actor.name,"Edited service request",id);return r},
    deleteRequest(id){const actor=this.user();if(!actor||actor.role!=="resident")return false;const d=get(),r=d.requests.find(x=>x.id===id&&x.userId===actor.id);if(!r)return false;d.requests=d.requests.filter(x=>x.id!==id);d.notifications=(d.notifications||[]).filter(n=>n.targetRequestId!==id);set(d);addAudit(actor.name,"Deleted service request",id);return true},
    deleteResident(id){const actor=this.user();if(!actor||actor.role!=="admin")return false;const d=get(),resident=d.users.find(x=>x.id===id&&x.role==="resident");if(!resident)return false;const requestIds=new Set(d.requests.filter(x=>x.userId===id).map(x=>x.id));d.users=d.users.filter(x=>x.id!==id);d.requests=d.requests.filter(x=>x.userId!==id);d.notifications=(d.notifications||[]).filter(n=>n.userId!==id&&!requestIds.has(n.targetRequestId));set(d);addAudit(actor.name,"Deleted resident account",resident.email+" ("+requestIds.size+" requests)");return {resident,requestCount:requestIds.size}},
    updateProfile(form){const d=get(),u=d.users.find(x=>x.id===this.current());if(!u)return false;u.name=form.name.trim();u.phone=form.phone.trim();u.address=form.address.trim();u.birthDate=form.birthDate||u.birthDate||"";u.gender=form.gender||u.gender||"";if(typeof form.photo==="string")u.photo=form.photo;set(d);addAudit(u.name,"Updated profile","Profile");return true},
    addAnnouncement(title,body){const d=get();d.announcements.unshift({id:"ann-"+Date.now(),title,body,date:now(),active:true});set(d);addAudit(this.user()?.name||"Administrator","Published announcement",title)},
    markRead(id){const d=get();d.notifications.filter(n=>n.userId===this.current()).forEach(n=>{if(!id||n.id===id)n.read=true});set(d)},
    resetDemo(){localStorage.removeItem(KEY);sessionStorage.removeItem("digigyde_session");seed()},
    time:now
  };
  seed();
})();