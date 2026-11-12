# Qur'on tilovati (Windows 10/11)

## Papka tuzilishi
- `app/`    index.html, overlays_data.js, translation.js (dastur kodi)
- `media/`  images/, audios1/, audios2/ (TO'LIQ rasm va audio fayllaringiz; GitHub'ga yuklanmaydi)
- `main.js`, `package.json`, `build/icon.ico`, `.github/workflows/build.yml`

## EXE ni GitHub orqali yig'ish
1. GitHub'da yangi repo oching.
2. Shu papkaning ichidagilarni (media/ dan tashqari, u .gitignore da) repoga yuklang.
3. Repo > Actions > "Build Windows EXE" > Run workflow.
4. 3-5 daqiqadan keyin Artifacts bo'limidan `QuronTilovati-Windows` ni yuklab oling:
   - `QuronTilovati-Setup-1.0.0.exe`    (o'rnatuvchi)
   - `QuronTilovati-Portable-1.0.0.exe` (o'rnatmasdan ishlaydi)

## Rasm va audiolar
Audio va rasmlar hajmi juda katta bo'lgani uchun EXE ichiga qo'shilmaydi.
Dastur ularni shu tartibda qidiradi:
1. EXE yonidagi `media` papka (ichida images, audios1, audios2)
2. Avval tanlangan papka
3. Topilmasa, birinchi ishga tushganda papka tanlash oynasi chiqadi (keyin Ctrl+O bilan o'zgartirish mumkin)

## Tugmalar
- "Развернуть" tugmasi, F11: to'liq ekran
- Esc yoki F11: to'liq ekrandan chiqish
- Ctrl+O: media papkasini tanlash
- Boshqa tugmalar (P, B, R, T, Y va h.k.) avvalgidek

## Kompyuterda sinash
`npm install` keyin `npm start`
