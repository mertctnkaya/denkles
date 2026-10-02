const fs = require('fs');
let c = fs.readFileSync('src/pages/PartyDetail.tsx', 'utf8');
c = c.replace(/  \/\/ 2\. Durum: Yüklendi ama parti yok, hata var veya kullanıcı bu grupta değil[\s\S]*?<\/div>\s*\);\s*\}/, `  // 2. Durum: Yüklendi ama parti yok, hata var veya kullanıcı bu grupta değil
  if (error || !currentParty || !myMember) {
    setTimeout(() => {
      addToast(error || 'Grup bulunamadı veya yetkiniz yok.', 'error');
      navigate('/', { replace: true });
    }, 0);
    return null;
  }`);
fs.writeFileSync('src/pages/PartyDetail.tsx', c);
