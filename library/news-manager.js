(() => {
  'use strict';
  const API_URL = window.APP_CONFIG.API_URL;
  let items = [], mode = 'none';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  async function api(action, data = {}) {
    const token = sessionStorage.getItem('mysiteAdminToken') || '';
    const response = await fetch(API_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({mode:'newsadmin',action,data,token})});
    if(!response.ok) throw new Error(`HTTP ${response.status}`); const result=await response.json(); if(!result.success) throw new Error(result.message||'ดำเนินการไม่สำเร็จ'); return result.data;
  }
  function modeBadge(newsNo){if(mode==='block')return '<span class="news-mode-badge news-mode-slide">สไลด์</span>';if(String(newsNo)==='1')return '<span class="news-mode-badge news-mode-static">ภาพนิ่ง</span>';return ''}
  function compressNewsImage(file){
    return new Promise((resolve,reject)=>{
      if(!file)return reject(new Error('กรุณาเลือกไฟล์รูปภาพ'));
      if(!String(file.type||'').startsWith('image/'))return reject(new Error('ไฟล์ที่เลือกต้องเป็นรูปภาพ'));
      if(file.size>8*1024*1024)return reject(new Error('รูปภาพต้นฉบับต้องมีขนาดไม่เกิน 8 MB'));
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('อ่านไฟล์รูปภาพไม่สำเร็จ'));
      reader.onload=()=>{
        const image=new Image();
        image.onerror=()=>reject(new Error('เปิดรูปภาพไม่สำเร็จ'));
        image.onload=()=>{
          try{
            const maxSide=1600;
            const ratio=Math.min(1,maxSide/Math.max(image.width||1,image.height||1));
            const canvas=document.createElement('canvas');
            canvas.width=Math.max(1,Math.round((image.width||1)*ratio));
            canvas.height=Math.max(1,Math.round((image.height||1)*ratio));
            const ctx=canvas.getContext('2d');
            ctx.drawImage(image,0,0,canvas.width,canvas.height);
            let quality=.82;
            let dataUrl=canvas.toDataURL('image/jpeg',quality);
            while(dataUrl.length>3.8*1024*1024 && quality>.48){
              quality-=.08;
              dataUrl=canvas.toDataURL('image/jpeg',quality);
            }
            const base=(String(file.name||'news-poster').replace(/\.[^.]+$/,'')||'news-poster');
            resolve({dataUrl,fileName:base+'.jpg'});
          }catch(err){reject(err)}
        };
        image.src=String(reader.result||'');
      };
      reader.readAsDataURL(file);
    });
  }
  function tableHtml(){return `<div class="news-manager-shell"><div class="news-manager-toolbar"><h2>จัดการข่าวสาร</h2><div class="news-manager-actions"><label class="news-manager-switch"><input id="newsManagerMode" type="checkbox" ${mode==='block'?'checked':''}><span class="slide-slider" aria-hidden="true"></span><span class="slide-text">${mode==='block'?'แสดงภาพเป็นสไลด์':'แสดงภาพเป็นภาพนิ่ง'}</span></label><button id="newsManagerAdd" class="news-manager-add">เพิ่มข่าวใหม่</button></div></div><div class="news-manager-body"><div class="news-manager-table-wrap"><table class="news-manager-table"><thead><tr><th>จัดลำดับ</th><th>ข่าวที่</th><th>หัวข้อหลัก</th><th>รูปภาพ</th><th>รายละเอียดโดยย่อ</th><th>URL</th><th>วันที่ลงข่าว</th><th>จัดการ</th></tr></thead><tbody>${items.length?items.map(i=>`<tr><td><button class="news-manager-btn news-manager-up" data-move="up" data-row="${i.rowNumber}">▲</button><button class="news-manager-btn news-manager-down" data-move="down" data-row="${i.rowNumber}">▼</button></td><td>${modeBadge(i.newsNo)}<div>${esc(i.newsNo)}</div></td><td>${esc(i.title)}</td><td><img class="news-manager-thumb" data-image="${esc(i.imageUrl)}" src="${esc(i.imageUrl)}" alt=""></td><td>${esc(i.detail)}</td><td>${i.detailUrl?`<a class="news-manager-link" href="${esc(i.detailUrl)}" target="_blank" rel="noopener">Link</a>`:''}</td><td>${esc(i.postDate)}</td><td><button class="news-manager-btn news-manager-edit" data-edit="${i.rowNumber}"><i class="fa-solid fa-pen"></i></button><button class="news-manager-btn news-manager-delete" data-delete="${i.rowNumber}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join(''):'<tr><td colspan="8" style="text-align:center">ยังไม่มีข้อมูลข่าวสาร</td></tr>'}</tbody></table></div></div></div>`}
  async function load(){const data=await api('list');items=data.items||[];mode=data.mode==='block'?'block':'none';}
  async function openManager(){Swal.fire({title:'กำลังโหลด...',didOpen:()=>Swal.showLoading(),allowOutsideClick:false});try{await load();renderManager();}catch(e){Swal.fire('ผิดพลาด',e.message,'error')}}
  function renderManager(){Swal.fire({html:tableHtml(),showConfirmButton:false,showCloseButton:true,width:'96vw',customClass:{popup:'news-manager-popup'},didOpen:bindManager});}
  function bindManager(){const root=Swal.getPopup();root.querySelector('#newsManagerAdd').onclick=()=>openEditor();root.querySelector('#newsManagerMode').onchange=async e=>{try{mode=await api('mode',{value:e.target.checked?'block':'none'});document.dispatchEvent(new Event('news-admin-updated'));renderManager()}catch(err){Swal.fire('ผิดพลาด',err.message,'error')}};root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(items.find(i=>i.rowNumber===Number(b.dataset.edit))));root.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>removeNews(Number(b.dataset.delete)));root.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>moveNews(Number(b.dataset.row),b.dataset.move));root.querySelectorAll('[data-image]').forEach(img=>img.onclick=()=>Swal.fire({imageUrl:img.dataset.image,showConfirmButton:false,showCloseButton:true,width:900}));}
  async function openEditor(item={}){
    let upload=null;
    const html=`<div class="news-editor-grid"><div class="news-editor-preview"><h3 id="newsPreviewTitle">${esc(item.title||'หัวข้อหลัก')}</h3><img id="newsPreviewImage" src="${esc(item.imageUrl||'')}" alt="ตัวอย่างรูปข่าว"><p id="newsPreviewDetail">${esc(item.detail||'รายละเอียดโดยย่อ')}</p></div><div class="news-editor-form"><label>หัวข้อหลัก</label><input id="newsTitle" value="${esc(item.title||'')}"><label>URL รูปภาพโปสเตอร์ข่าว หรืออัปโหลดรูป</label><div class="news-image-source-row"><input id="newsImage" type="url" placeholder="https://..." value="${esc(item.imageUrl||'')}"><label class="news-image-upload-btn" for="newsImageFile"><i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> อัปโหลดรูป</label><input id="newsImageFile" class="news-image-file" type="file" accept="image/*"></div><small id="newsImageUploadStatus" class="news-image-upload-status">เลือกใส่ URL หรืออัปโหลด JPG, PNG, WEBP ฯลฯ (ระบบจะย่อรูปก่อนบันทึก)</small><label>รายละเอียดโดยย่อ</label><textarea id="newsDetail">${esc(item.detail||'')}</textarea><label>URL กดดูรายละเอียด</label><input id="newsUrl" value="${esc(item.detailUrl||'')}"></div></div>`;
    const result=await Swal.fire({
      title:item.rowNumber?'แก้ไขข่าวสาร':'เพิ่มข่าวใหม่',html,width:1000,showCancelButton:true,confirmButtonText:'บันทึก',cancelButtonText:'ยกเลิก',confirmButtonColor:'#16a34a',
      didOpen:()=>{
        const p=Swal.getPopup();
        const title=p.querySelector('#newsTitle'),imageUrl=p.querySelector('#newsImage'),file=p.querySelector('#newsImageFile'),preview=p.querySelector('#newsPreviewImage'),detail=p.querySelector('#newsDetail'),status=p.querySelector('#newsImageUploadStatus');
        const syncText=()=>{p.querySelector('#newsPreviewTitle').textContent=title.value||'หัวข้อหลัก';p.querySelector('#newsPreviewDetail').textContent=detail.value||'รายละเอียดโดยย่อ'};
        title.addEventListener('input',syncText);detail.addEventListener('input',syncText);
        imageUrl.addEventListener('input',()=>{upload=null;preview.src=imageUrl.value.trim();status.textContent='ใช้ URL รูปภาพที่ระบุ';status.classList.remove('is-ready','is-error')});
        file.addEventListener('change',async()=>{
          const selected=file.files&&file.files[0];if(!selected)return;
          status.textContent='กำลังเตรียมรูปภาพ...';status.classList.remove('is-ready','is-error');
          try{upload=await compressNewsImage(selected);preview.src=upload.dataUrl;status.textContent='เลือกรูปแล้ว: '+selected.name;status.classList.add('is-ready')}
          catch(err){upload=null;file.value='';status.textContent=err.message;status.classList.add('is-error')}
        });
      },
      preConfirm:()=>{
        const p=Swal.getPopup();
        const data={rowNumber:item.rowNumber||'',title:p.querySelector('#newsTitle').value.trim(),imageUrl:p.querySelector('#newsImage').value.trim(),imageData:upload?.dataUrl||'',imageName:upload?.fileName||'',detail:p.querySelector('#newsDetail').value.trim(),detailUrl:p.querySelector('#newsUrl').value.trim()};
        if(!data.title||(!data.imageUrl&&!data.imageData)||!data.detail||!data.detailUrl){Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบ และระบุ URL รูปภาพหรืออัปโหลดรูป');return false}
        return data;
      }
    });
    if(result.isConfirmed){try{Swal.fire({title:'กำลังบันทึกข่าว...',didOpen:()=>Swal.showLoading(),allowOutsideClick:false});await api('save',result.value);document.dispatchEvent(new Event('news-admin-updated'));await load();renderManager()}catch(e){Swal.fire('ผิดพลาด',e.message,'error')}}
  }
  async function removeNews(row){const ok=await Swal.fire({title:'ยืนยันการลบ?',text:'ต้องการลบข่าวนี้ใช่หรือไม่',icon:'warning',showCancelButton:true,confirmButtonText:'ลบ',cancelButtonText:'ยกเลิก',confirmButtonColor:'#dc2626'});if(!ok.isConfirmed)return;try{await api('delete',{rowNumber:row});document.dispatchEvent(new Event('news-admin-updated'));await load();renderManager()}catch(e){Swal.fire('ผิดพลาด',e.message,'error')}}
  async function moveNews(row,direction){try{Swal.fire({title:'กำลังจัดลำดับข่าว...',didOpen:()=>Swal.showLoading(),allowOutsideClick:false});await api('move',{rowNumber:row,direction});document.dispatchEvent(new Event('news-admin-updated'));await load();renderManager()}catch(e){Swal.fire('ผิดพลาด',e.message,'error')}}
  document.getElementById('manageNewsButton')?.addEventListener('click',openManager);
})();
