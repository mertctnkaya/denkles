const fs = require('fs');
let c = fs.readFileSync('src/pages/PartyDetail.tsx', 'utf8');

c = c.replace('  const [isDeletingParty, setIsDeletingParty] = useState(false);', 
`  const [isDeletingParty, setIsDeletingParty] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);`);

c = c.replace(`  useEffect(() => {
    if (id) {
      fetchPartyDetails(id);`, 
`  useEffect(() => {
    if (id) {
      setHasFetched(true);
      fetchPartyDetails(id);`);

c = c.replace(/  \/\/ 1\. Durum: İlk sayfa yüklemesi[\s\S]*?return null;\s*\}/, 
`  useEffect(() => {
    if (hasFetched && !isLoading && (error || !currentParty || !myMember)) {
      addToast(error || 'Grup bulunamadı veya yetkiniz yok.', 'error');
      navigate('/', { replace: true });
    }
  }, [hasFetched, isLoading, error, currentParty, myMember, navigate, addToast]);

  // 1. Durum: İlk sayfa yüklemesi (parti verisi henüz hiç gelmediyse)
  if (!hasFetched || (isLoading && !currentParty)) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Durum: Yüklendi ama parti yok, hata var veya kullanıcı bu grupta değil (useEffect navigate edecek)
  if (error || !currentParty || !myMember) {
    return null;
  }`);

fs.writeFileSync('src/pages/PartyDetail.tsx', c);
