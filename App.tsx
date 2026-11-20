// RouteUbud v5 — Expo / React Native (TypeScript)
// Install: npx expo install @react-native-async-storage/async-storage expo-crypto @expo/vector-icons react-native-maps expo-image-picker expo-image-manipulator
// Peta interaktif memakai Leaflet + OpenStreetMap di web dan react-native-maps di Android/iOS.
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import React, { useCallback, useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert,
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Linking,
  Modal, Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

let ImagePicker: any = null; try { ImagePicker = require("expo-image-picker"); } catch { ImagePicker = null; }
let Manipulator: any = null; try { Manipulator = require("expo-image-manipulator"); } catch { Manipulator = null; }
let RNMaps: any = null;
if (Platform.OS !== "web") { try { RNMaps = require("react-native-maps"); } catch { RNMaps = null; } }

/* ───────────────────────── Tokens (palet brand v2) ─────────────────────────
   BEIGE CREAM #C7B6A6 (kanvas + teks terbalik di atas gelap) · FOREST GREEN #0E3325 (utama)
   CHARCOAL BLACK #141414 (teks utama di atas terang) · BURGUNDY #4B2328 · MUSTARD #C98C12 · OLIVE #6E7324
   Warna turunan (paper, sage, line, muted, *Ink) hanya variasi tint/shade dari keenam warna ini. */
const C = {
  cream: "#e2d8ce", green: "#0E3325", ink: "#141414",
  burgundy: "#4B2328", mustard: "#C98C12", olive: "#6E7324",
  // turunan
  paper: "#D9CCBE", green2: "#1F5A40", sage: "#B9B496", sage2: "#9FA07A",
  goldSoft: "#E2CB93", muted: "#4A4138", line: "#AE9C8A", errBg: "#D6B4AC",
  oliveInk: "#4A4E15", mustardInk: "#5E3F06",
  white: "#C7B6A6",   // teks/ikon di atas latar gelap = BEIGE CREAM
  gold: "#C98C12", star: "#C98C12", brown: "#141414", navy: "#141414",
  padi: "#1f4720",    // nature & tourism   -> olive
  kunyit: "#C98C12",  // culture & history  -> mustard
  bunga: "#4B2328",   // temples & wear     -> burgundy
  lawar: "#1f6a6b",   // crafts & UMKM      -> charcoal
  red: "#4B2328",
};
const CATC: Record<string, string> = { explore: C.padi, culture: C.kunyit, wear: C.bunga, umkm: C.lawar, act: C.green2 };
// Teks di atas warna: charcoal di atas mustard (terang), beige cream di atas warna gelap.
const onColor = (bg: string) => (bg === C.mustard ? C.ink : C.cream);
const INK: Record<string, string> = { place: C.oliveInk, culture: C.mustardInk, umkm: C.ink };
const CATB: Record<string, string> = { place: C.padi, culture: C.kunyit, umkm: C.lawar };
const CATI: Record<string, string> = { place: "map-marker-radius", culture: "temple-hindu", umkm: "storefront" };
const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });
const TOP = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
const SOFT = { shadowColor: "#141414", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 } as const;

// Where suggestions are sent. Leave "" to only save them on the device.
const SUGGEST_EMAIL = "";

/* ───────────────────────── i18n ───────────────────────── */
type Lang = "en" | "id";
type L = { en: string; id: string };
const L = (en: string, id: string): L => ({ en, id });
const same = (s: string): L => L(s, s);
const LangCtx = React.createContext<{ lang: Lang; t: (l: L) => string }>({ lang: "en", t: l => l.en });
const useT = () => useContext(LangCtx);

const S = {
  tagline: L("Explore the Culture, Preserve the Future.", "Jelajahi Budaya, Lestarikan Masa Depan."),
  motto: L("Explore. Learn. Support. Sustain.", "Jelajahi. Pelajari. Dukung. Lestarikan."),
  loginTitle: L("Welcome back", "Selamat datang kembali"),
  registerTitle: L("Create your account", "Buat akun Anda"),
  name: L("Your name", "Nama Anda"), email: same("Email"), password: L("Password", "Kata sandi"),
  login: L("Log in", "Masuk"), register: L("Create account", "Buat akun"),
  toRegister: L("New here? Create an account", "Baru di sini? Buat akun"),
  toLogin: L("Already have an account? Log in", "Sudah punya akun? Masuk"),
  errEmail: L("Enter a valid email address.", "Masukkan alamat email yang valid."),
  errPw: L("Password needs at least 6 characters.", "Kata sandi minimal 6 karakter."),
  errName: L("Enter your name.", "Masukkan nama Anda."),
  errExists: L("This email is already registered. Log in instead.", "Email ini sudah terdaftar. Silakan masuk."),
  errBad: L("Email or password is incorrect.", "Email atau kata sandi salah."),
  hello: (n: string) => L(`Hello, ${n}!`, `Halo, ${n}!`),
  searchPh: L("Search destination...", "Cari destinasi..."),
  topDest: L("Top Destinations", "Destinasi Unggulan"),
  seeAll: L("See all", "Lihat semua"),
  noResults: L("Nothing matches your search.", "Tidak ada hasil yang cocok."),
  recent: L("Recently viewed", "Baru dilihat"),
  explore: L("Explore", "Jelajahi"), exploreSub: L("Find your perfect route in Ubud", "Temukan rute terbaik Anda di Ubud"),
  culture: L("Culture & Education", "Budaya & Edukasi"), cultureSub: L("Learn more about Balinese culture", "Pelajari lebih lanjut budaya Bali"),
  wear: same("Ubud to Wear"), wearSub: L("Travel Responsibly in Ubud", "Berwisata Bertanggung Jawab di Ubud"),
  umkm: same("UMKM for Ubud"), umkmSub: L("Support Local, Shop Local", "Dukung Lokal, Belanja Lokal"),
  act: L("Reflect & Act", "Renungkan & Bertindak"), actSub: L("Small Actions, Big Impact", "Aksi Kecil, Dampak Besar"),
  all: L("All", "Semua"),
  quizTitle: L("Quiz: Balinese Culture", "Kuis: Budaya Bali"), quizSub: L("Test your knowledge!", "Uji pengetahuan Anda!"),
  takeQuiz: L("Take Quiz", "Mulai Kuis"),
  wearNote: L("Let's respect the culture and keep the sacred places in Ubud.", "Mari hormati budaya dan jaga tempat-tempat suci di Ubud."),
  wearVary: L("Rules vary by site. Ask staff or your host.", "Aturan berbeda di tiap lokasi. Tanyakan petugas atau tuan rumah."),
  actHero: L("Let's keep Ubud green!", "Mari jaga Ubud tetap hijau!"), actHeroSub: L("Reduce waste, preserve nature.", "Kurangi sampah, lestarikan alam."),
  activities: L("Activities for You", "Aktivitas untuk Anda"),
  greenQuiz: L("Take a Sustainability Quiz", "Ikuti Kuis Keberlanjutan"), greenQuizSub: L("Learn & earn a badge", "Belajar & raih lencana"),
  cleanup: L("Join a Community Clean-up", "Ikut Bersih-bersih Komunitas"), cleanupSub: L("Together for a greener Ubud", "Bersama untuk Ubud yang lebih hijau"),
  joined: L("Interest saved", "Minat tersimpan"),
  cleanupMsg: L("We saved your interest. Event details will appear here once local organizers are confirmed.", "Minat Anda tersimpan. Detail acara akan muncul di sini setelah penyelenggara lokal dikonfirmasi."),
  moreAct: L("See More Activities", "Lihat Aktivitas Lainnya"),
  goodToKnow: L("Good to know", "Perlu diketahui"),
  save: L("Save", "Simpan"), saved: L("Saved", "Tersimpan"),
  markVisited: L("Mark as visited", "Tandai sudah dikunjungi"), visited: L("Visited", "Dikunjungi"),
  openMaps: L("Open in Maps", "Buka di Maps"),
  tabHome: L("Home", "Beranda"), tabMap: L("Map", "Peta"), tabPlan: L("Plan", "Rencana"), tabSaved: L("Saved", "Tersimpan"), tabProfile: L("Profile", "Profil"),
  savedSub: L("Your saved routes stay with your account.", "Rute tersimpan Anda tetap ada di akun Anda."),
  savedEmpty: L("Nothing saved yet. Tap the bookmark on any story to keep it here.", "Belum ada yang disimpan. Ketuk penanda pada cerita mana pun untuk menyimpannya di sini."),
  member: L("Traveler Member", "Anggota Traveler"), badges: L("Badges", "Lencana"),
  myTrips: L("My Trips", "Perjalanan Saya"), settings: L("Settings", "Pengaturan"), language: L("Language", "Bahasa"),
  help: L("Help & Support", "Bantuan & Dukungan"), about: L("About RouteUbud", "Tentang RouteUbud"),
  logout: L("Log out", "Keluar"), logoutMsg: L("Your saved routes stay on this device.", "Rute tersimpan Anda tetap ada di perangkat ini."),
  cancel: L("Cancel", "Batal"),
  tripsEmpty: L("Mark places as visited and they will show up here.", "Tandai tempat sebagai sudah dikunjungi dan akan muncul di sini."),
  clearHistory: L("Clear viewing history", "Hapus riwayat lihat"),
  helpText: L("Help center is coming soon. For now, confirm local details with your host or the site itself.", "Pusat bantuan segera hadir. Untuk saat ini, konfirmasi detail lokal dengan tuan rumah atau pengelola lokasi."),
  aboutText: L("Om Swastiastu. RouteUbud is your smart travel companion in Ubud: discover places, learn the meaning behind traditions, dress with respect, support local makers, and travel sustainably.", "Om Swastiastu. RouteUbud adalah teman perjalanan pintar Anda di Ubud: temukan tempat, pelajari makna di balik tradisi, berbusana dengan hormat, dukung pengrajin lokal, dan berwisata berkelanjutan."),
  disclaimer: L("Prototype content. Visit durations are estimates; ratings are shown only when verified. Confirm access, cultural guidance and business details with trusted local sources.", "Konten prototipe. Durasi kunjungan merupakan perkiraan; rating hanya ditampilkan jika sudah terverifikasi. Konfirmasi akses, panduan budaya, dan detail usaha dengan sumber lokal tepercaya."),
  checkLocal: L("Opening hours, prices and menus can change. Please confirm locally.", "Jam buka, harga, dan menu dapat berubah. Mohon konfirmasi langsung di lokasi."),
  foodRec: L("Food Recommendation", "Rekomendasi Kuliner"),
  next: L("Next", "Lanjut"), finish: L("Finish", "Selesai"), close: L("Close", "Tutup"),
  correct: L("Correct!", "Benar!"), wrong: L("Not quite.", "Belum tepat."),
  score: (s: number, n: number) => L(`You got ${s} of ${n} right.`, `Anda menjawab benar ${s} dari ${n}.`),
  perfect: L("Perfect score. Badge earned!", "Nilai sempurna. Lencana diraih!"),
  tryAgain: L("Read the stories again and retake the quiz for a perfect score.", "Baca ceritanya lagi dan ulangi kuis untuk nilai sempurna."),
  chooseLang: L("Choose Your Language", "Pilih Bahasa Anda"),
  selectLang: L("Select your preferred language to continue.", "Pilih bahasa yang Anda inginkan untuk melanjutkan."),
  forLocal: L("For local visitors", "Untuk wisatawan lokal"), forIntl: L("For international visitors", "Untuk wisatawan mancanegara"),
  continue: L("Continue", "Lanjut"),
  whatToday: L("Where would you like to go today?", "Ke mana Anda ingin pergi hari ini?"),
  tileExplore: L("Places to visit", "Tempat untuk dikunjungi"),
  tileCulture: L("Traditions and their meaning", "Tradisi dan maknanya"),
  tileWear: L("Temple dress and etiquette", "Busana dan etika di pura"),
  tileUmkm: L("Local makers, food and shops", "Pengrajin, kuliner, dan toko lokal"),
  quickRules: L("Before you visit a temple", "Sebelum mengunjungi pura"),
  seeGuide: L("See the full guide", "Lihat panduan lengkap"),
  greenBanner: L("Travel lightly in Ubud", "Berwisata ringan di Ubud"),
  guest: L("Continue as guest", "Lanjut sebagai tamu"),
  guestNote: L("Browse without an account. Create one later and your saved places come with you.", "Jelajahi tanpa akun. Buat akun nanti dan tempat tersimpan Anda ikut terbawa."),
  guestLabel: L("Guest · saved on this device", "Tamu · tersimpan di perangkat ini"),
  authOrCreate: L("Log in or create account", "Masuk atau buat akun"),
  min: (n: number) => L(`${n} min`, `${n} mnt`),
  suggest: L("Suggestion Box", "Kotak Saran"),
  suggestSub: L("Share ideas for Ubud tourism or for this app.", "Bagikan ide untuk pariwisata Ubud atau aplikasi ini."),
  suggestTourism: L("Ubud tourism", "Pariwisata Ubud"),
  suggestApp: L("App development", "Pengembangan aplikasi"),
  suggestPh: L("Write your suggestion here...", "Tulis saran Anda di sini..."),
  send: L("Send suggestion", "Kirim saran"),
  errShort: L("Please write a little more (at least 5 characters).", "Mohon tulis sedikit lebih panjang (minimal 5 karakter)."),
  thanks: L("Thank you!", "Terima kasih!"),
  thanksMsg: L("Your suggestion has been recorded.", "Saran Anda sudah tercatat."),
  another: L("Write another", "Tulis saran lain"),
  // Map
  mapTitle: L("Ubud Map", "Peta Ubud"),
  mapSub: L("Destinations, food and local makers in one map", "Destinasi, kuliner, dan pengrajin lokal dalam satu peta"),
  mapWeb: L("Explore Ubud on the map. Select a pin to see the destination.", "Jelajahi Ubud melalui peta. Pilih penanda untuk melihat destinasi."),
  approx: L("Approximate pin. Confirm the exact spot in Maps.", "Titik perkiraan. Konfirmasi lokasi pastinya di Maps."),
  noGeo: L("Nothing on the map for this filter yet.", "Belum ada lokasi di peta untuk filter ini."),
  details: L("Details", "Detail"),
  showOnMap: L("Show on map", "Lihat di peta"),
  myPlan: L("My plan", "Rencana saya"),
  craft: L("Craft", "Kerajinan"),
  // Video
  watch: L("Watch video", "Tonton video"),
  // Planner
  planTitle: L("Trip Planner", "Perencana Perjalanan"),
  planSub: L("Build your Ubud itinerary, day by day", "Susun itinerari Ubud Anda, hari demi hari"),
  day: (n: number) => L(`Day ${n}`, `Hari ${n}`),
  addPlan: L("Add to plan", "Tambah ke rencana"),
  inPlan: L("In your plan", "Ada di rencana"),
  addedTo: (n: number) => L(`Added to Day ${n}`, `Ditambahkan ke Hari ${n}`),
  planEmpty: L("No stops yet. Add places from the map, from a place page, or from the ideas below.", "Belum ada pemberhentian. Tambahkan tempat dari peta, halaman tempat, atau ide di bawah."),
  planIdeas: L("Nearby ideas", "Ide terdekat"),
  planIdeasEmpty: L("Everything on the map is already in your plan.", "Semua lokasi di peta sudah ada di rencana Anda."),
  planTotal: (t: string) => L(`Estimated time on site: ${t}`, `Perkiraan waktu di lokasi: ${t}`),
  planFrom: (k: string) => L(`~${k} km from previous stop`, `~${k} km dari pemberhentian sebelumnya`),
  planNote: L("Distances are straight-line and visit times are rough estimates. Check traffic and opening hours locally.", "Jarak berupa garis lurus dan durasi kunjungan hanya perkiraan. Cek lalu lintas dan jam buka secara lokal."),
  openRoute: L("Open route in Maps", "Buka rute di Maps"),
  clearDay: L("Clear this day", "Kosongkan hari ini"),
  deleteDay: L("Delete this day", "Hapus hari ini"),
  addDay: L("Add day", "Tambah hari"),
  moveDay: L("Move to next day", "Pindah ke hari berikutnya"),
  // Quiz list
  questions: (n: number) => L(`${n} questions`, `${n} pertanyaan`),
  best: (s: number, n: number) => L(`Best ${s}/${n}`, `Terbaik ${s}/${n}`),
  quizWear: L("Quiz: Dress & Etiquette", "Kuis: Busana & Etika"),
  quizPlaces: L("Quiz: Places in Ubud", "Kuis: Tempat di Ubud"),
  quizGreen: L("Quiz: Sustainable Ubud", "Kuis: Ubud Berkelanjutan"),
  // Account
  editProfile: L("Edit profile", "Ubah profil"),
  choosePhoto: L("Choose from gallery", "Pilih dari galeri"),
  takePhoto: L("Take a photo", "Ambil foto"),
  removePhoto: L("Remove photo", "Hapus foto"),
  photoPerm: L("Permission is needed to use your photos or camera. You can allow it in your device settings.", "Izin diperlukan untuk memakai foto atau kamera. Anda dapat mengizinkannya di pengaturan perangkat."),
  photoErr: L("The photo could not be used. Try another one.", "Foto tidak dapat dipakai. Coba foto lain."),
  photoPkg: L("Photo upload needs the expo-image-picker package. Run: npx expo install expo-image-picker", "Unggah foto membutuhkan paket expo-image-picker. Jalankan: npx expo install expo-image-picker"),
  displayName: L("Display name", "Nama tampilan"),
  saveChanges: L("Save changes", "Simpan perubahan"),
  nameSaved: L("Profile updated.", "Profil diperbarui."),
  changePassword: L("Change password", "Ubah kata sandi"),
  currentPw: L("Current password", "Kata sandi saat ini"),
  newPw: L("New password", "Kata sandi baru"),
  confirmPw: L("Confirm password", "Konfirmasi kata sandi"),
  errPw8: L("Use at least 8 characters with a letter and a number.", "Gunakan minimal 8 karakter dengan huruf dan angka."),
  errConfirm: L("Passwords do not match.", "Kata sandi tidak sama."),
  errCurrent: L("Current password is incorrect.", "Kata sandi saat ini salah."),
  pwChanged: L("Password updated.", "Kata sandi diperbarui."),
  pwHint: L("At least 8 characters, with a letter and a number.", "Minimal 8 karakter, dengan huruf dan angka."),
  showPw: L("Show password", "Tampilkan kata sandi"), hidePw: L("Hide password", "Sembunyikan kata sandi"),
  deleteAccount: L("Delete account", "Hapus akun"),
  deleteMsg: L("This removes your account, saved places, plan and photo from this device. This cannot be undone.", "Ini menghapus akun, tempat tersimpan, rencana, dan foto dari perangkat ini. Tindakan ini tidak dapat dibatalkan."),
  errLocked: (s: number) => L(`Too many attempts. Try again in ${s}s.`, `Terlalu banyak percobaan. Coba lagi dalam ${s} dtk.`),
  localNote: L("Accounts are stored on this device only.", "Akun disimpan hanya di perangkat ini."),
};

const KIND: Record<string, L> = {
  nature: L("Nature", "Alam"), culture: L("Culture", "Budaya"), temple: L("Temple", "Pura"),
  tradition: L("Tradition", "Tradisi"), etiquette: L("Etiquette", "Etika"), history: L("History", "Sejarah"),
  handicraft: L("Handicraft", "Kerajinan"), food: L("Food", "Kuliner"), fashion: L("Textiles", "Tekstil"),
};

/* ───────────────────────── Photos ─────────────────────────
   1. Taruh foto asli di ./assets/photos/  2. Hapus tanda // pada baris yang sesuai.
   Selama belum aktif, aplikasi memakai foto cadangan dari IMG. */
const PHOTO: Record<string, ImageSourcePropType> = {
  // p1: require("./assets/photos/tegallalang.jpg"),
  // p2: require("./assets/photos/taman-saraswati.jpg"),
  // p3: require("./assets/photos/campuhan-ridge.jpg"),
  // p4: require("./assets/photos/puri-saren.jpg"),
  // p5: require("./assets/photos/monkey-forest.jpg"),
  // p6: require("./assets/photos/subak-sok-wayah.jpg"),
  // p7: require("./assets/photos/sumampan-waterfall.jpg"),
  // p8: require("./assets/photos/kokokan-petulu.jpg"),
  // p9: require("./assets/photos/museum-puri-lukisan.jpg"),
  // p10: require("./assets/photos/puri-agung-peliatan.jpg"),
  // p11: require("./assets/photos/museum-pendet.jpg"),
  // p12: require("./assets/photos/museum-topeng-setia-darma.jpg"),
  // p13: require("./assets/photos/pura-gunung-lebah.jpg"),
  // c1: require("./assets/photos/canang-sari.jpg"),
  // c7: require("./assets/photos/ngiring.jpg"),
  // c8: require("./assets/photos/ngaben.jpg"),
  // c9: require("./assets/photos/pura-gunung-lebah-story.jpg"),
  // u1: require("./assets/photos/ukiran-kayu-mas.jpg"),
  // u2: require("./assets/photos/perak.jpg"),
  // u3: require("./assets/photos/be-tutu-peliatan.jpg"),
  // u4: require("./assets/photos/babi-guling-bu-oka.jpg"),
  // u5: require("./assets/photos/ayam-kedewatan.jpg"),
  // u6: require("./assets/photos/klepon-gianyar.jpg"),
  // u7: require("./assets/photos/dagang-topot.jpg"),
  // u8: require("./assets/photos/tenun-pesalakan.jpg"),
  // wear_dress: require("./assets/photos/wear-dress.jpg"),
  // wear_sacred: require("./assets/photos/wear-sacred.jpg"),
  // wear_tips: require("./assets/photos/wear-tips.jpg"),
};
const IMG = {
  terrace: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1000",
  temple: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1000",
  ridge: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1000",
  canang: "https://images.unsplash.com/photo-1604999333679-b86d54738315?w=1000",
  harmony: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1000",
  worship: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1000",
  craft: "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=1000",
  food: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1000",
};
const pic = (id: string, fallback: string): ImageSourcePropType => PHOTO[id] ?? { uri: fallback };

/* ───────────────────────── Peta: koordinat & video ─────────────────────────
   GEO: koordinat tiap lokasi. approx:true = titik perkiraan (belum diverifikasi), akan diberi catatan di aplikasi.
   Periksa dan koreksi lewat Google Maps (klik kanan lokasi → salin koordinat).
   Item tanpa lokasi pasti (u2 Demo perak, u7 Dagang Topot) belum ditaruh di peta. */
type Geo = { lat: number; lng: number; approx?: boolean };
const GEO: Record<string, Geo> = {
  p1: { lat: -8.432172, lng: 115.278694 }, p2: { lat: -8.5069, lng: 115.2603 }, p3: { lat: -8.498515, lng: 115.255227 },
  p4: { lat: -8.5069, lng: 115.2625 }, p5: { lat: -8.518598, lng: 115.260080 }, p6: { lat: -8.4990, lng: 115.2830, approx: true },
  p7: { lat: -8.5850, lng: 115.2760, approx: true }, p8: { lat: -8.4833, lng: 115.2822, approx: true },
  p9: { lat: -8.5062, lng: 115.2604 }, p10: { lat: -8.5143, lng: 115.2737 }, p11: { lat: -8.5160, lng: 115.2650, approx: true },
  p12: { lat: -8.533819, lng: 115.280519 }, p13: { lat: -8.5073, lng: 115.2520 },
  u1: { lat: -8.5530, lng: 115.2690, approx: true }, u3: { lat: -8.5130, lng: 115.2740, approx: true },
  u4: { lat: -8.5039, lng: 115.2622 }, u5: { lat: -8.5010, lng: 115.2470, approx: true },
  u6: { lat: -8.5440, lng: 115.3260, approx: true }, u8: { lat: -8.5200, lng: 115.2750, approx: true },
};
const CENTER: Geo = { lat: -8.5069, lng: 115.2625 };

// Isi link video spesifik di sini (mis. u4: "https://www.youtube.com/watch?v=XXXX").
// Jika kosong, tombol "Tonton video" membuka pencarian YouTube untuk destinasi tersebut.
const VIDEO: Record<string, string> = {};
const VQ: Record<string, string> = {
  c1: "canang sari Bali offering meaning", c2: "Tri Hita Karana Bali", c3: "Subak Bali irrigation rice terraces",
  c4: "Ubud art village Bali painting dance", c5: "Bali offerings etiquette tourists", c6: "Bali ceremony procession tourist etiquette",
  c7: "Ngiring Balinese greeting", c8: "Ngaben Bali cremation ceremony", c9: "Pura Gunung Lebah Campuhan Ubud",
  u1: "Mas village wood carving Bali", u2: "Bali silver jewelry making", u3: "Be Tutu Peliatan Bali", u7: "Dagang Topot Bali",
};
const WEAR_VIDEO_Q = "Bali temple dress code kamen sash tourists";
const ytSearch = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

/* ───────────────────────── Content ───────────────────────── */
type CatKey = "place" | "culture" | "umkm";
type Item = {
  id: string; cat: CatKey; kind: string; title: L; loc: L; image: ImageSourcePropType;
  rating?: number; mins?: number; body: L; tips?: L[]; mapQuery?: string;
};

const ITEMS: Item[] = [
  /* ── Places: Nature ── */
  { id: "p1", cat: "place", kind: "nature", title: same("Tegallalang Rice Terrace"), loc: same("Tegallalang"), image: pic("p1", IMG.terrace), mins: 25,
    body: L("Terraced rice fields north of Ubud, shaped by the subak irrigation system. Visit early for softer light and fewer crowds.",
            "Sawah bertingkat di utara Ubud yang dibentuk oleh sistem irigasi subak. Datanglah pagi hari untuk cahaya lembut dan lebih sedikit keramaian."),
    tips: [L("Check weather and access before going", "Cek cuaca dan akses sebelum berangkat"),
           L("Wear shoes with good grip on the steps", "Pakai sepatu dengan cengkeraman baik di anak tangga"),
           L("Stay on marked paths; the fields are working farmland", "Tetap di jalur yang ditandai; sawah ini adalah lahan petani")],
    mapQuery: "Tegallalang Rice Terrace" },
  { id: "p5", cat: "place", kind: "nature", title: same("Monkey Forest Ubud"), loc: L("Padangtegal, Ubud", "Padangtegal, Ubud"), image: pic("p5", IMG.ridge),
    body: L("A forest sanctuary in the middle of Ubud, home to long-tailed macaques and temples within the forest. Keep your distance from the monkeys.",
            "Hutan suci di tengah Ubud, rumah bagi monyet ekor panjang dan pura-pura di dalam hutan. Jaga jarak dari monyet."),
    tips: [L("Do not feed the monkeys", "Jangan memberi makan monyet"),
           L("Keep food, glasses and phones out of reach", "Simpan makanan, kacamata, dan ponsel agar tidak terjangkau"),
           L("Follow staff guidance and posted rules", "Ikuti arahan petugas dan aturan yang terpasang")],
    mapQuery: "Sacred Monkey Forest Sanctuary Ubud" },
  { id: "p6", cat: "place", kind: "nature", title: same("Subak Sok Wayah"), loc: L("Ubud area", "Area Ubud"), image: pic("p6", IMG.terrace),
    body: L("A walk through rice fields watered by the subak system. The paddies are worked daily, so keep to the paths.",
            "Jalan santai melewati sawah yang diairi sistem subak. Sawah dikerjakan setiap hari, jadi tetap di jalur."),
    tips: [L("Stay on paths and respect the farmers", "Tetap di jalur dan hormati petani"),
           L("Bring water and sun protection", "Bawa air minum dan pelindung matahari")],
    mapQuery: "Subak Sok Wayah Ubud" },
  { id: "p7", cat: "place", kind: "nature", title: same("Sumampan Waterfall"), loc: L("Ubud area", "Area Ubud"), image: pic("p7", IMG.ridge),
    body: L("A waterfall reached on foot. Paths and rocks can be slippery, especially after rain. Confirm access and conditions locally.",
            "Air terjun yang dicapai dengan berjalan kaki. Jalur dan batu bisa licin, terutama setelah hujan. Konfirmasi akses dan kondisi secara lokal."),
    tips: [L("Wear shoes with good grip", "Pakai sepatu dengan cengkeraman baik"),
           L("Avoid going after heavy rain", "Hindari berkunjung setelah hujan deras")],
    mapQuery: "Sumampan Waterfall Ubud" },
  { id: "p8", cat: "place", kind: "nature", title: same("Desa Kokokan Petulu"), loc: same("Petulu"), image: pic("p8", IMG.terrace),
    body: L("A village north of Ubud known for the white herons (kokokan) that roost in its trees. They usually return in the late afternoon.",
            "Desa di utara Ubud yang terkenal dengan burung kokokan putih yang bertengger di pepohonannya. Biasanya mereka kembali pada sore hari."),
    tips: [L("Go in the late afternoon for the herons", "Datang sore hari untuk melihat kokokan"),
           L("Keep quiet and do not disturb the birds", "Jaga ketenangan dan jangan mengganggu burung")],
    mapQuery: "Desa Kokokan Petulu" },
  { id: "p3", cat: "place", kind: "nature", title: same("Campuhan Ridge Walk"), loc: same("Ubud"), image: pic("p3", IMG.ridge), mins: 20,
    body: L("A ridge-top walking route through grassy hills close to town. Best outside the midday heat.",
            "Jalur jalan kaki di punggung bukit berumput dekat pusat kota. Paling nyaman di luar panas tengah hari."),
    tips: [L("Bring water and sun protection", "Bawa air minum dan pelindung matahari"),
           L("Check trail conditions after rain", "Cek kondisi jalur setelah hujan")],
    mapQuery: "Campuhan Ridge Walk Ubud" },

  /* ── Places: Culture ── */
  { id: "p9", cat: "place", kind: "culture", title: same("Museum Puri Lukisan"), loc: L("Central Ubud", "Pusat Ubud"), image: pic("p9", IMG.worship),
    body: L("One of Ubud's long-standing art museums, with Balinese painting and carving. A good first stop to understand the town's arts.",
            "Salah satu museum seni tertua di Ubud, menampilkan lukisan dan ukiran Bali. Tempat awal yang baik untuk memahami seni Ubud."),
    mapQuery: "Museum Puri Lukisan Ubud" },
  { id: "p4", cat: "place", kind: "culture", title: same("Puri Saren Agung (Ubud Palace)"), loc: L("Central Ubud", "Pusat Ubud"), image: pic("p4", IMG.worship), mins: 10,
    body: L("A royal palace complex in the heart of Ubud and a landmark of the town's history and arts. Check visiting hours and performance schedules locally.",
            "Kompleks puri di jantung Ubud dan penanda sejarah serta seni kota ini. Cek jam kunjungan dan jadwal pertunjukan secara lokal."),
    mapQuery: "Puri Saren Agung Ubud" },
  { id: "p10", cat: "place", kind: "culture", title: same("Puri Agung Peliatan"), loc: same("Peliatan"), image: pic("p10", IMG.worship),
    body: L("A royal palace in Peliatan, a village next to Ubud known for Balinese dance. Check visiting rules and performance schedules locally.",
            "Puri di Peliatan, desa di samping Ubud yang dikenal dengan tari Bali. Cek aturan kunjungan dan jadwal pertunjukan secara lokal."),
    mapQuery: "Puri Agung Peliatan" },
  { id: "p11", cat: "place", kind: "culture", title: same("Museum Pendet"), loc: L("Ubud area", "Area Ubud"), image: pic("p11", IMG.worship),
    body: L("A museum in the Ubud area. Confirm opening hours and entry rules locally before you visit.",
            "Museum di area Ubud. Konfirmasi jam buka dan aturan masuk secara lokal sebelum berkunjung."),
    mapQuery: "Museum Pendet Ubud" },
  { id: "p12", cat: "place", kind: "culture", title: same("Museum Topeng Setia Darma"), loc: same("Mas"), image: pic("p12", IMG.craft),
    body: L("A museum of masks and puppets in Mas village, with collections from Indonesia and other countries.",
            "Museum topeng dan wayang di Desa Mas, dengan koleksi dari Indonesia dan negara lain."),
    mapQuery: "Setia Darma House of Masks and Puppets Mas" },

  /* ── Places: Temple ── */
  { id: "p2", cat: "place", kind: "temple", title: same("Pura Taman Saraswati"), loc: L("Central Ubud", "Pusat Ubud"), image: pic("p2", IMG.temple), mins: 15,
    body: L("A temple known for its lotus pond in the middle of Ubud. Confirm visitor access and ceremony schedules locally before your visit.",
            "Pura yang dikenal dengan kolam teratainya di tengah Ubud. Konfirmasi akses pengunjung dan jadwal upacara secara lokal sebelum berkunjung."),
    tips: [L("Follow posted rules and staff guidance", "Ikuti aturan yang terpasang dan arahan petugas"),
           L("Ask before taking photos during ceremonies", "Minta izin sebelum memotret saat upacara")],
    mapQuery: "Pura Taman Saraswati Ubud" },
  { id: "p13", cat: "place", kind: "temple", title: same("Pura Gunung Lebah"), loc: L("Campuhan, Ubud", "Campuhan, Ubud"), image: pic("p13", IMG.temple),
    body: L("A temple at Campuhan, where two rivers meet. It is a place of worship first: dress properly and follow local guidance.",
            "Pura di Campuhan, tempat pertemuan dua sungai. Ini adalah tempat ibadah: berbusanalah dengan pantas dan ikuti arahan setempat."),
    tips: [L("Wear a kamen and sash if required", "Kenakan kamen dan selendang jika diwajibkan"),
           L("Ask before entering during ceremonies", "Tanyakan dulu sebelum masuk saat ada upacara")],
    mapQuery: "Pura Gunung Lebah Ubud" },

  /* ── Culture & Education ── */
  { id: "c1", cat: "culture", kind: "tradition", title: L("The Meaning of Canang Sari", "Makna Canang Sari"), loc: L("Daily offering", "Persembahan harian"), image: pic("c1", IMG.canang),
    body: L("Canang sari is a small daily offering of flowers on a woven palm-leaf base, an expression of gratitude placed at homes, shops and shrines. Details and symbolism vary by family and community, so treat this as an introduction and ask locals for their own explanation.",
            "Canang sari adalah persembahan harian kecil berisi bunga di atas alas janur, ungkapan rasa syukur yang diletakkan di rumah, toko, dan tempat suci. Rincian dan simbolismenya berbeda antar keluarga dan komunitas, jadi anggap ini pengantar dan tanyakan penjelasan langsung pada warga setempat."),
    tips: [L("Do not step on or over offerings", "Jangan menginjak atau melangkahi sesajen"), L("If unsure, walk around them", "Jika ragu, berjalanlah mengitarinya")] },
  { id: "c7", cat: "culture", kind: "tradition", title: same("Ngiring"), loc: L("A word of invitation", "Kata ajakan"), image: pic("c7", IMG.harmony),
    body: L("Ngiring is a polite Balinese word of invitation, roughly \"please, let's go together\" or \"please join us\". Hearing it is a sign of hospitality. Smile and answer with \"suksma\" (thank you).",
            "Ngiring adalah kata Bali yang sopan untuk mengajak, kurang lebih \"silakan, mari bersama\" atau \"silakan bergabung\". Mendengarnya adalah tanda keramahan. Balaslah dengan senyum dan \"suksma\" (terima kasih).") },
  { id: "c8", cat: "culture", kind: "tradition", title: same("Ngaben"), loc: L("Cremation ceremony", "Upacara kremasi"), image: pic("c8", IMG.worship),
    body: L("Ngaben is the Balinese Hindu cremation ceremony, a sacred rite that helps release the soul so it can continue its journey. It is a family and community event, often with a procession. Details vary by family.",
            "Ngaben adalah upacara kremasi umat Hindu Bali, ritual suci untuk membantu melepas roh agar dapat melanjutkan perjalanannya. Ini adalah acara keluarga dan masyarakat, sering disertai prosesi. Rinciannya berbeda tiap keluarga."),
    tips: [L("Watch from a respectful distance and dress modestly", "Menonton dari jarak hormat dan berbusana sopan"),
           L("Never block the procession; ask before taking photos", "Jangan menghalangi prosesi; minta izin sebelum memotret")] },
  { id: "c2", cat: "culture", kind: "tradition", title: same("Tri Hita Karana"), loc: L("A philosophy of harmony", "Filosofi keharmonisan"), image: pic("c2", IMG.harmony),
    body: L("A Balinese philosophy about keeping balance between people, nature, and the divine. It shows up in daily life, from village organisation to farming. This card is a starting point, not a complete account.",
            "Filosofi Bali tentang menjaga keseimbangan antara manusia, alam, dan Tuhan. Hadir dalam keseharian, dari tata desa hingga bertani. Kartu ini hanya titik awal, bukan penjelasan lengkap.") },
  { id: "c3", cat: "culture", kind: "tradition", title: same("Subak"), loc: L("Rice-field water system", "Sistem air sawah"), image: pic("c3", IMG.terrace),
    body: L("Subak is the traditional cooperative system that shares irrigation water among rice farmers, linked to the Tri Hita Karana philosophy. It shapes the terraces you see around Ubud.",
            "Subak adalah sistem kooperatif tradisional yang membagi air irigasi di antara petani padi, terkait dengan filosofi Tri Hita Karana. Sistem ini membentuk sawah bertingkat yang Anda lihat di sekitar Ubud.") },
  { id: "c5", cat: "culture", kind: "etiquette", title: L("Respecting Offerings", "Menghormati Sesajen"), loc: L("Everyday etiquette", "Etika sehari-hari"), image: pic("c5", IMG.canang),
    body: L("You will see offerings on pavements, doorsteps and shrines. They are made with care and renewed daily. Watch your step, and never move or take them for photos.",
            "Anda akan melihat sesajen di trotoar, depan pintu, dan tempat suci. Dibuat dengan penuh perhatian dan diperbarui setiap hari. Perhatikan langkah, dan jangan memindahkan atau mengambilnya untuk foto.") },
  { id: "c6", cat: "culture", kind: "etiquette", title: L("Around Ceremonies", "Saat Ada Upacara"), loc: L("Processions and prayers", "Prosesi dan doa"), image: pic("c6", IMG.temple),
    body: L("Ceremonies and processions take priority on the road and at temples. Give space, stay behind participants, and follow local guidance on where visitors may stand.",
            "Upacara dan prosesi didahulukan di jalan dan di pura. Beri ruang, berdiri di belakang peserta, dan ikuti arahan setempat tentang tempat berdiri pengunjung.") },
  { id: "c9", cat: "culture", kind: "history", title: L("The Story of Pura Gunung Lebah", "Cerita di Balik Pura Gunung Lebah"), loc: L("Where two rivers meet", "Tempat dua sungai bertemu"), image: pic("c9", IMG.temple),
    body: L("Pura Gunung Lebah stands at Campuhan, a name that means a meeting of rivers. Local tradition links it to the priest Rsi Markandeya, said to have meditated here; the name Ubud is often connected to \"ubad\" (medicine). Accounts differ, so treat this as a starting point.",
            "Pura Gunung Lebah berdiri di Campuhan, nama yang berarti pertemuan sungai. Tradisi setempat mengaitkannya dengan Rsi Markandeya, yang dipercaya pernah bermeditasi di sini; nama Ubud sering dikaitkan dengan \"ubad\" (obat). Versi ceritanya beragam, jadi anggap ini titik awal.") },
  { id: "c4", cat: "culture", kind: "history", title: L("Ubud and the Arts", "Ubud dan Seni"), loc: L("A town of artists", "Kota para seniman"), image: pic("c4", IMG.worship),
    body: L("Ubud is widely known as a centre of Balinese painting, carving, dance and music. Its arts scene grew through the work of local artists and the support of the Ubud royal family, together with visiting artists in the early 20th century.",
            "Ubud dikenal luas sebagai pusat lukisan, ukiran, tari, dan musik Bali. Dunia seninya tumbuh lewat karya seniman lokal dan dukungan puri Ubud, bersama seniman yang berkunjung pada awal abad ke-20.") },

  /* ── UMKM: handicraft ── */
  { id: "u1", cat: "umkm", kind: "handicraft", title: L("Wood Carving in Mas", "Ukiran Kayu di Mas"), loc: L("Mas village", "Desa Mas"), image: pic("u1", IMG.craft),
    body: L("Mas village is known for Balinese wood carving. Watch the carvers at work, ask about the wood and how long a piece takes, and buy directly from the maker.",
            "Desa Mas dikenal dengan ukiran kayu Bali. Lihat para pengukir bekerja, tanyakan jenis kayu dan lama pengerjaan, dan beli langsung dari pengrajin."),
    tips: [L("Ask about the type of wood", "Tanyakan jenis kayunya"), L("Buying direct supports the carver's family", "Membeli langsung mendukung keluarga pengukir")],
    mapQuery: "Mas wood carving Ubud" },
  { id: "u2", cat: "umkm", kind: "handicraft", title: L("Silver-Making Demo", "Demo Pembuatan Perak"), loc: L("Ubud area", "Area Ubud"), image: pic("u2", IMG.craft),
    body: L("See how silver jewelry is shaped by hand and ask about the materials and techniques. Check where and when demonstrations run.",
            "Lihat bagaimana perhiasan perak dibentuk dengan tangan dan tanyakan bahan serta tekniknya. Cek lokasi dan jadwal demonstrasi."),
    mapQuery: "silver jewelry workshop Ubud" },

  /* ── UMKM: food recommendation ── */
  { id: "u3", cat: "umkm", kind: "food", title: same("Be Tutu Peliatan"), loc: same("Peliatan"), image: pic("u3", IMG.food),
    body: L("A Balinese dish of spiced, shredded meat served in Peliatan. Ask the seller what is in it if you have dietary needs.",
            "Hidangan Bali berupa daging berbumbu yang disuwir, disajikan di Peliatan. Tanyakan isinya ke penjual jika Anda punya pantangan makanan."),
    mapQuery: "Be Tutu Peliatan" },
  { id: "u4", cat: "umkm", kind: "food", title: same("Babi Guling Bu Oka"), loc: L("Ubud", "Ubud"), image: pic("u4", IMG.food),
    body: L("A well-known place for babi guling, Balinese roast suckling pig. It is pork, so it is not suitable for everyone. Expect queues at peak hours.",
            "Tempat terkenal untuk babi guling, hidangan babi panggang khas Bali. Mengandung babi, jadi tidak cocok untuk semua orang. Siap antre di jam ramai."),
    tips: [L("Contains pork", "Mengandung babi"), L("Go outside peak lunch hours to avoid queues", "Datang di luar jam makan siang agar tidak antre")],
    mapQuery: "Babi Guling Ibu Oka Ubud" },
  { id: "u5", cat: "umkm", kind: "food", title: same("Ayam Kedewatan Bu Mangku"), loc: same("Kedewatan"), image: pic("u5", IMG.food),
    body: L("A local favourite for ayam Kedewatan, Balinese-style chicken from the Kedewatan area, served with traditional sides.",
            "Favorit warga untuk ayam Kedewatan, ayam khas Bali dari kawasan Kedewatan, disajikan dengan lauk tradisional."),
    mapQuery: "Ayam Kedewatan Bu Mangku" },
  { id: "u6", cat: "umkm", kind: "food", title: same("Klepon Gianyar"), loc: same("Gianyar"), image: pic("u6", IMG.food),
    body: L("Klepon are sweet rice-flour balls filled with palm sugar and rolled in grated coconut. Bite carefully: the sugar inside is liquid.",
            "Klepon adalah bola tepung beras berisi gula merah dan dibalut kelapa parut. Gigit pelan-pelan: gula di dalamnya cair."),
    mapQuery: "Klepon Gianyar" },
  { id: "u7", cat: "umkm", kind: "food", title: same("Dagang Topot"), loc: L("Local vendor", "Pedagang lokal"), image: pic("u7", IMG.food),
    body: L("A local vendor selling traditional Balinese snacks. Ask what is available that day and where to find it.",
            "Pedagang lokal yang menjual jajanan tradisional Bali. Tanyakan apa yang tersedia hari itu dan di mana menemukannya.") },

  /* ── UMKM: textiles ── */
  { id: "u8", cat: "umkm", kind: "fashion", title: L("Weaving in Banjar Pesalakan", "Tenun Banjar Pesalakan"), loc: same("Banjar Pesalakan"), image: pic("u8", IMG.worship),
    body: L("Local weavers in Banjar Pesalakan make traditional woven cloth by hand. Ask about the pattern, the thread and how long a piece takes.",
            "Pengrajin tenun di Banjar Pesalakan membuat kain tenun tradisional dengan tangan. Tanyakan motif, benang, dan lama pengerjaan."),
    tips: [L("Handwoven cloth takes days to make; prices reflect that", "Kain tenun tangan butuh berhari-hari; harganya mencerminkan itu")],
    mapQuery: "Banjar Pesalakan Ubud tenun" },
];
// Foto memakai sumber Commons dan situs resmi yang relevan. Beberapa foto kategori adalah ilustrasi tema, bukan foto vendor/lokasi spesifik.
const commonsPhoto = (file: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=1200`;
const REAL_PHOTOS: Record<string, string> = {
  // Place-specific photos verified against the source page / caption.
  p1: commonsPhoto("Tegallalang Rice Terrace.jpg"),
  p2: commonsPhoto("Lotus flower, Pura Taman Saraswati, Ubud, Bali, 20220823 0841 0253.jpg"),
  p3: commonsPhoto("Campuhan Ridge Walk, Ubud, Bali, 20220822 1422 0140.jpg"),
  p4: commonsPhoto("Ubud palace.jpg"),
  p5: commonsPhoto("Sacred Monkey Forest Sanctuary (49818583783).jpg"),
  p6: commonsPhoto("Rice Terrace in Ubud.jpg"), // representative rice-field landscape; not claimed as Sok Wayah itself
  p7: commonsPhoto("Sumampan Waterfall.jpg"),
  p8: commonsPhoto("Kokokan Birds.jpg"),
  p9: commonsPhoto("Puri Lukisan Museum (16435717564).jpg"),
  p10: commonsPhoto("Peliatan, Ubud 200507-2.jpg"), // Peliatan village context; not a verified Puri Agung facade
  p11: "https://cdn.digitaldesa.com/uploads/profil/51.04.05.2002/berita/4e6f7936a28094713b5798008ea5fdc2.jpg",
  p12: "https://www.maskandpuppets.com/Asset/Images/HD/Feature/11.jpg",
  p13: commonsPhoto("Pura Gunung Lebah1.JPG"),
  // Culture: each ID has a distinct image relevant to its subject.
  c1: commonsPhoto("Making canang at Pasar Ubud.jpg"),
  c2: commonsPhoto("Kesederhaan orang bali. The simplicity of Balinese.jpg"),
  c3: commonsPhoto("WikiSubak - Soka - ES -22 irigasi sawah.jpg"),
  c4: commonsPhoto("Balinese dance in Ubud, Kecak, 20220822 1839 0180.jpg"),
  c5: commonsPhoto("Canang sari.jpg"),
  c6: commonsPhoto("Upacara Melasti Masyarakat Hindu Bali.jpg"),
  c7: commonsPhoto("Balinese greetings on a class entrance.JPG"),
  c8: commonsPhoto("Ngaben Ceremony or Cremation in Bali.jpg"),
  c9: commonsPhoto("Pura Gunung Lebah2.JPG"),
  // UMKM / food: distinct thematic images; exact vendor attribution is not implied unless stated.
  u1: commonsPhoto("Wood carving in Bali.jpg"),
  u2: commonsPhoto("Making silver jewellery.jpg"),
  u3: commonsPhoto("Bebek tutu.jpg"),
  u4: commonsPhoto("Babi guling.jpg"),
  u5: commonsPhoto("Ayam Betutu Bali.jpg"),
  u6: commonsPhoto("Klepon Top View.jpg"),
  u7: commonsPhoto("TRADITIONAL MARKET.jpg"),
  u8: commonsPhoto("Weaving in Bali.jpg"),
};

// Photo credits are surfaced on each detail page. Confirm each file's license before commercial use.
const PHOTO_CREDITS: Record<string, { label: string; url: string }> = {
  p1: { label: "Tegallalang Rice Terrace · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Tegallalang_Rice_Terrace.jpg" },
  p2: { label: "Jakub Hałun · CC BY-SA 4.0 · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Lotus_flower,_Pura_Taman_Saraswati,_Ubud,_Bali,_20220823_0841_0253.jpg" },
  p3: { label: "Jakub Hałun · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Campuhan_Ridge_Walk,_Ubud,_Bali,_20220822_1422_0140.jpg" },
  p4: { label: "Ubud Palace · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Ubud_palace.jpg" },
  p5: { label: "Jorge Franganillo · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Sacred_Monkey_Forest_Sanctuary_(49818583783).jpg" },
  p7: { label: "Anggabuana · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Sumampan_Waterfall.jpg" },
  p8: { label: "Kokokan Birds at Petulu · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Kokokan_Birds.jpg" },
  p11: { label: "Pemerintah Desa Mas · Museum Pendet", url: "https://mas.desa.id/wisata/museum-pendet" },
  p12: { label: "Official Setia Darma Museum gallery · Wayang collection", url: "https://www.maskandpuppets.com/overall.html" },
  c1: { label: "Marklchaves · CC BY-SA 4.0 · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Making_canang_at_Pasar_Ubud.jpg" },
  c4: { label: "Jakub Hałun · CC BY-SA 4.0 · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Balinese_dance_in_Ubud,_Kecak,_20220822_1839_0180.jpg" },
  c6: { label: "Upacara Melasti · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Upacara_Melasti_Masyarakat_Hindu_Bali.jpg" },
  c8: { label: "Krisnayuda3 · CC BY 4.0 · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Ngaben_Ceremony_or_Cremation_in_Bali.jpg" },
  c9: { label: "Pura Gunung Lebah · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Pura_Gunung_Lebah2.JPG" },
  p6: { label: "Rice Terrace in Ubud · Wikimedia Commons (representative landscape)", url: "https://commons.wikimedia.org/wiki/File:Rice_Terrace_in_Ubud.jpg" },
  p9: { label: "Museum Puri Lukisan · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Puri_Lukisan_Museum_(16435717564).jpg" },
  p10: { label: "Peliatan village · Wikimedia Commons (not a verified palace facade)", url: "https://commons.wikimedia.org/wiki/File:Peliatan,_Ubud_200507-2.jpg" },
  c2: { label: "Yande Artha · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Kesederhaan_orang_bali._The_simplicity_of_Balinese.jpg" },
  c3: { label: "Eka343 · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:WikiSubak_-_Soka_-_ES_-22_irigasi_sawah.jpg" },
  c5: { label: "Canang Sari · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Canang_sari.jpg" },
  c7: { label: "Balinese greetings · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Balinese_greetings_on_a_class_entrance.JPG" },
  u1: { label: "Wood carving in Bali · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Wood_carving_in_Bali.jpg" },
  u2: { label: "Mauro Cateb · Making silver jewellery · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Making_silver_jewellery.jpg" },
  u3: { label: "Bebek tutu · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Bebek_tutu.jpg" },
  u4: { label: "Babi guling · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Babi_guling.jpg" },
  u5: { label: "Ayam Betutu Bali · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Ayam_Betutu_Bali.jpg" },
  u6: { label: "Klepon Top View · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Klepon_Top_View.jpg" },
  u7: { label: "Dedy Siswandi · Traditional market · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:TRADITIONAL_MARKET.jpg" },
  u8: { label: "Weaving in Bali · Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Weaving_in_Bali.jpg" },
};
ITEMS.forEach(item => {
  const url = REAL_PHOTOS[item.id];
  if (url) item.image = { uri: url };
});

// Foto Wikimedia Commons bisa diminta dalam ukuran lebih kecil: hemat data & lebih cepat untuk thumbnail.
const _sizedCache: Record<string, ImageSourcePropType> = {};
const sized = (src: ImageSourcePropType, w: number): ImageSourcePropType => {
  const uri = (src as any)?.uri as string | undefined;
  if (!uri || !uri.includes("width=1200")) return src;
  const k = `${uri}|${w}`;
  return (_sizedCache[k] ??= { uri: uri.replace("width=1200", `width=${w}`) });
};

const byId: Record<string, Item> = Object.fromEntries(ITEMS.map(i => [i.id, i]));
const MAPPED = ITEMS.filter(i => GEO[i.id]);
const videoUrl = (i: Item) => VIDEO[i.id] ?? ytSearch(VQ[i.id] ?? `${i.title.en} Ubud Bali`);

// Perkiraan durasi kunjungan (menit) per jenis tempat — untuk perencana perjalanan.
const DUR: Record<string, number> = { nature: 90, culture: 60, temple: 45, handicraft: 60, food: 45, fashion: 45 };
const fmtDur = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
const kmBetween = (a: Geo, b: Geo) => {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
const stopRef = (i: Item) => { const g = GEO[i.id]; return g && !g.approx ? `${g.lat},${g.lng}` : i.mapQuery ?? `${i.title.en} Ubud`; };
const openRoute = (stops: Item[]) => {
  if (!stops.length) return;
  const refs = stops.map(stopRef);
  const wp = refs.slice(0, -1).slice(0, 9);
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(refs[refs.length - 1])}${wp.length ? `&waypoints=${encodeURIComponent(wp.join("|"))}` : ""}&travelmode=driving`).catch(() => {});
};

const kindColor = (k: string) => ({
  nature: C.olive, temple: C.burgundy, culture: C.mustard,
  food: C.ink, handicraft: C.green, fashion: C.green,
} as Record<string, string>)[k] ?? C.green;
const kindIcon = (k: string) => ({ nature: "tree", culture: "bank", temple: "temple-hindu", handicraft: "palette", fashion: "tshirt-crew", food: "silverware-fork-knife" } as Record<string, string>)[k] ?? "map-marker";

const WEAR: Record<string, { image: ImageSourcePropType; heading: L; items: L[] }> = {
  dress: { image: pic("wear_dress", IMG.temple), heading: L("Dress Code Guidelines", "Panduan Kode Busana"), items: [
    L("Wear decent clothing (cover shoulders & knees)", "Kenakan pakaian sopan (tutupi bahu & lutut)"),
    L("Use a sash when entering temples", "Gunakan selendang saat memasuki pura"),
    L("Wear a kamen (sarong) if the site requires one", "Kenakan kamen (kain) jika diwajibkan lokasi"),
    L("Avoid revealing outfits", "Hindari pakaian yang terbuka")] },
  sacred: { image: pic("wear_sacred", IMG.worship), heading: L("Sacred Areas", "Area Suci"), items: [
    L("Follow posted signs and staff instructions", "Ikuti rambu dan arahan petugas"),
    L("Stay out of areas reserved for worshippers", "Jangan masuk area yang diperuntukkan bagi umat yang beribadah"),
    L("Never step on or over offerings", "Jangan menginjak atau melangkahi sesajen"),
    L("Do not climb on shrines or walls", "Jangan memanjat bangunan suci atau tembok")] },
  tips: { image: pic("wear_tips", IMG.canang), heading: L("Other Tips", "Tips Lain"), items: [
    L("Speak softly and keep your phone on silent", "Berbicara pelan dan setel ponsel ke senyap"),
    L("Ask before photographing people who are praying", "Minta izin sebelum memotret orang yang sedang berdoa"),
    L("Give way to processions and ceremonies", "Beri jalan untuk prosesi dan upacara"),
    L("Ask your host when you are unsure", "Tanyakan pada tuan rumah jika ragu")] },
};
const WEAR_TABS: [string, L][] = [["dress", L("Dress Code", "Kode Busana")], ["sacred", L("Sacred Areas", "Area Suci")], ["tips", L("Other Tips", "Tips Lain")]];

/* ───────────────────────── Kuis (4 kuis, 37 pertanyaan; urutan diacak tiap main) ───────────────────────── */
type QItem = { q: L; opts: L[]; ans: number; why: L };
type Quiz = { title: L; qs: QItem[] };
const Q = (q: L, opts: [string, string][], ans: number, why: L): QItem => ({ q, opts: opts.map(([e, i]) => L(e, i)), ans, why });
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

const QUIZZES: Record<string, Quiz> = {
  culture: { title: S.quizTitle, qs: [
    Q(L("What is canang sari?", "Apa itu canang sari?"),
      [["A small daily offering of gratitude", "Persembahan harian kecil sebagai ungkapan syukur"], ["A souvenir sold at temples", "Suvenir yang dijual di pura"], ["A dance costume", "Kostum tari"], ["A kind of entry ticket", "Sejenis tiket masuk"]], 0,
      L("It is an offering of flowers placed daily at homes, shops and shrines.", "Berupa persembahan bunga yang diletakkan setiap hari di rumah, toko, dan tempat suci.")),
    Q(L("You see an offering on the ground. What do you do?", "Anda melihat sesajen di tanah. Apa yang Anda lakukan?"),
      [["Step over it", "Melangkahinya"], ["Walk around it", "Berjalan mengitarinya"], ["Move it for a photo", "Memindahkannya untuk foto"], ["Pick it up", "Mengambilnya"]], 1,
      L("Offerings are respected; walk around them.", "Sesajen dihormati; berjalanlah mengitarinya.")),
    Q(L("Tri Hita Karana is about harmony between…", "Tri Hita Karana adalah tentang keharmonisan antara…"),
      [["People, nature and the divine", "Manusia, alam, dan Tuhan"], ["Three villages in Ubud", "Tiga desa di Ubud"], ["Hotels and tourists", "Hotel dan wisatawan"], ["Day, night and rain", "Siang, malam, dan hujan"]], 0,
      L("It describes balance between people, nature and the spiritual dimension.", "Filosofi ini menggambarkan keseimbangan manusia, alam, dan dimensi spiritual.")),
    Q(L("Many temples ask visitors to wear…", "Banyak pura meminta pengunjung mengenakan…"),
      [["A raincoat", "Jas hujan"], ["A kamen (sarong) and sash", "Kamen (kain) dan selendang"], ["A hat", "Topi"], ["Sports shoes only", "Hanya sepatu olahraga"]], 1,
      L("Rules vary by site, but a kamen and sash are commonly required.", "Aturan berbeda di tiap lokasi, tetapi kamen dan selendang umumnya diwajibkan.")),
    Q(L("What is Ngaben?", "Apa itu Ngaben?"),
      [["A wedding ceremony", "Upacara pernikahan"], ["A Balinese Hindu cremation ceremony", "Upacara kremasi umat Hindu Bali"], ["A harvest festival", "Festival panen"], ["A temple anniversary", "Hari jadi pura"]], 1,
      L("It is a sacred rite that helps release the soul to continue its journey.", "Ritual suci untuk membantu melepas roh agar dapat melanjutkan perjalanannya.")),
    Q(L("What does “suksma” mean?", "Apa arti “suksma”?"),
      [["Hello", "Halo"], ["Thank you", "Terima kasih"], ["Goodbye", "Sampai jumpa"], ["Sorry", "Maaf"]], 1,
      L("Suksma is the Balinese way to say thank you.", "Suksma adalah cara mengucapkan terima kasih dalam bahasa Bali.")),
    Q(L("What is subak?", "Apa itu subak?"),
      [["A cooperative system that shares irrigation water", "Sistem kooperatif pembagian air irigasi"], ["A kind of Balinese dance", "Sejenis tari Bali"], ["A market for crafts", "Pasar kerajinan"], ["A royal title", "Gelar kerajaan"]], 0,
      L("Subak shares water among rice farmers and shapes the terraces around Ubud.", "Subak membagi air di antara petani padi dan membentuk sawah bertingkat di sekitar Ubud.")),
    Q(L("Someone says “ngiring” to you. It is…", "Seseorang berkata “ngiring” kepada Anda. Itu adalah…"),
      [["A polite invitation: please, let's go together", "Ajakan sopan: silakan, mari bersama"], ["A warning to leave", "Peringatan untuk pergi"], ["A price quote", "Penawaran harga"], ["A request for money", "Permintaan uang"]], 0,
      L("It is a sign of hospitality. Smile and answer “suksma”.", "Itu tanda keramahan. Balas dengan senyum dan “suksma”.")),
    Q(L("The name Campuhan refers to…", "Nama Campuhan merujuk pada…"),
      [["A meeting of rivers", "Pertemuan sungai"], ["A rice harvest", "Panen padi"], ["A royal palace", "Sebuah puri"], ["A type of offering", "Sejenis sesajen"]], 0,
      L("Pura Gunung Lebah stands where two rivers meet.", "Pura Gunung Lebah berdiri di tempat dua sungai bertemu.")),
    Q(L("The name Ubud is often linked to the word “ubad”, meaning…", "Nama Ubud sering dikaitkan dengan kata “ubad”, yang berarti…"),
      [["Medicine", "Obat"], ["Rice", "Padi"], ["River", "Sungai"], ["Temple", "Pura"]], 0,
      L("Accounts differ, so treat this as a starting point.", "Versi ceritanya beragam, jadi anggap ini titik awal.")),
    Q(L("Ubud is widely known as a centre of…", "Ubud dikenal luas sebagai pusat…"),
      [["Painting, carving, dance and music", "Lukisan, ukiran, tari, dan musik"], ["Heavy industry", "Industri berat"], ["Deep-sea fishing", "Penangkapan ikan laut dalam"], ["Skiing", "Ski"]], 0,
      L("Its arts scene grew through local artists and the Ubud royal family's support.", "Dunia seninya tumbuh lewat seniman lokal dan dukungan puri Ubud.")),
    Q(L("A ceremonial procession is passing. You should…", "Sebuah prosesi upacara lewat. Sebaiknya Anda…"),
      [["Give space and stay behind the participants", "Memberi ruang dan berdiri di belakang peserta"], ["Walk through the middle", "Berjalan di tengah prosesi"], ["Overtake it on a scooter", "Menyalipnya dengan sepeda motor"], ["Stand in front for a photo", "Berdiri di depan untuk foto"]], 0,
      L("Ceremonies take priority on the road and at temples.", "Upacara didahulukan di jalan dan di pura.")),
  ] },
  wear: { title: S.quizWear, qs: [
    Q(L("What should you cover when visiting a temple?", "Apa yang sebaiknya ditutup saat mengunjungi pura?"),
      [["Shoulders and knees", "Bahu dan lutut"], ["Only your hair", "Hanya rambut"], ["Only your feet", "Hanya kaki"], ["Nothing in particular", "Tidak ada"]], 0,
      L("Decent clothing that covers shoulders and knees is the baseline.", "Pakaian sopan yang menutup bahu dan lutut adalah standar dasar.")),
    Q(L("What is a kamen?", "Apa itu kamen?"),
      [["A cloth worn around the waist at temples", "Kain yang dililitkan di pinggang saat ke pura"], ["A type of offering", "Sejenis sesajen"], ["A temple guard", "Penjaga pura"], ["A rice dish", "Hidangan nasi"]], 0,
      L("Some sites require a kamen (sarong); ask staff if you are unsure.", "Beberapa lokasi mewajibkan kamen (kain); tanyakan petugas jika ragu.")),
    Q(L("A sign marks an area for worshippers only. You…", "Sebuah rambu menandai area khusus umat yang beribadah. Anda…"),
      [["Stay out", "Tidak masuk"], ["Enter quietly for a photo", "Masuk diam-diam untuk foto"], ["Enter if no one is looking", "Masuk jika tidak ada yang melihat"], ["Ask for a discount", "Meminta diskon"]], 0,
      L("Areas reserved for worshippers stay off-limits to visitors.", "Area untuk umat yang beribadah tertutup bagi pengunjung.")),
    Q(L("Before photographing someone who is praying, you…", "Sebelum memotret orang yang sedang berdoa, Anda…"),
      [["Ask first", "Meminta izin dulu"], ["Use flash for better light", "Memakai lampu kilat agar terang"], ["Get as close as possible", "Mendekat sedekat mungkin"], ["Fly a drone overhead", "Menerbangkan drone di atasnya"]], 0,
      L("Ask before photographing people who are praying.", "Minta izin sebelum memotret orang yang sedang berdoa.")),
    Q(L("In a temple, your phone should be…", "Di dalam pura, ponsel Anda sebaiknya…"),
      [["On silent", "Disetel senyap"], ["On speaker", "Dalam mode speaker"], ["Playing music", "Memutar musik"], ["On a video call", "Untuk video call"]], 0,
      L("Speak softly and keep your phone on silent.", "Berbicara pelan dan setel ponsel ke senyap.")),
    Q(L("You are unsure about a rule. What is best?", "Anda ragu tentang suatu aturan. Apa yang terbaik?"),
      [["Ask staff or your host", "Bertanya pada petugas atau tuan rumah"], ["Guess", "Menebak"], ["Copy other tourists", "Meniru wisatawan lain"], ["Ignore it", "Mengabaikannya"]], 0,
      L("Rules vary by site, so asking locally is always right.", "Aturan berbeda di tiap lokasi, jadi bertanya langsung selalu tepat.")),
    Q(L("Can you climb on shrines or walls for a photo?", "Bolehkah memanjat bangunan suci atau tembok untuk foto?"),
      [["No, never", "Tidak, jangan pernah"], ["Yes, if it is quick", "Boleh, asal cepat"], ["Yes, at sunset", "Boleh, saat matahari terbenam"], ["Only if it is empty", "Hanya jika sepi"]], 0,
      L("Do not climb on shrines or walls.", "Jangan memanjat bangunan suci atau tembok.")),
    Q(L("A procession blocks the road. You…", "Sebuah prosesi menutup jalan. Anda…"),
      [["Wait and give way", "Menunggu dan memberi jalan"], ["Honk", "Membunyikan klakson"], ["Push through", "Menerobos"], ["Take a detour through the crowd", "Memotong lewat kerumunan"]], 0,
      L("Give way to processions and ceremonies.", "Beri jalan untuk prosesi dan upacara.")),
  ] },
  places: { title: S.quizPlaces, qs: [
    Q(L("Tegallalang is famous for…", "Tegallalang terkenal dengan…"),
      [["Terraced rice fields", "Sawah bertingkat"], ["A volcano crater lake", "Danau kawah gunung"], ["A surf beach", "Pantai selancar"], ["A palace market", "Pasar di puri"]], 0,
      L("The terraces are shaped by the subak irrigation system.", "Sawah bertingkat dibentuk oleh sistem irigasi subak.")),
    Q(L("At the Monkey Forest, what should you do?", "Di Hutan Monyet, apa yang sebaiknya Anda lakukan?"),
      [["Keep food, glasses and phones out of reach", "Menyimpan makanan, kacamata, dan ponsel agar tidak terjangkau"], ["Feed the monkeys bananas", "Memberi monyet pisang"], ["Tease them for photos", "Menggoda monyet untuk foto"], ["Chase them", "Mengejar mereka"]], 0,
      L("Do not feed the monkeys and follow staff guidance.", "Jangan memberi makan monyet dan ikuti arahan petugas.")),
    Q(L("The white herons of Petulu are best seen…", "Burung kokokan putih di Petulu paling baik dilihat…"),
      [["In the late afternoon", "Pada sore hari"], ["At midnight", "Tengah malam"], ["At noon", "Tengah hari"], ["Only in the rainy season", "Hanya di musim hujan"]], 0,
      L("They usually return to roost in the late afternoon.", "Biasanya mereka kembali bertengger pada sore hari.")),
    Q(L("The Campuhan Ridge Walk is most comfortable…", "Campuhan Ridge Walk paling nyaman…"),
      [["Outside the midday heat", "Di luar panas tengah hari"], ["At 1 pm in full sun", "Pukul 13.00 di bawah terik"], ["During a storm", "Saat badai"], ["Only in the dark", "Hanya saat gelap"]], 0,
      L("Bring water and sun protection, and avoid midday.", "Bawa air minum dan pelindung matahari, dan hindari tengah hari.")),
    Q(L("Museum Topeng Setia Darma, a museum of masks and puppets, is in…", "Museum Topeng Setia Darma, museum topeng dan wayang, berada di…"),
      [["Mas village", "Desa Mas"], ["Kuta", "Kuta"], ["Nusa Penida", "Nusa Penida"], ["Singaraja", "Singaraja"]], 0,
      L("It is in Mas, with collections from Indonesia and other countries.", "Berada di Desa Mas, dengan koleksi dari Indonesia dan negara lain.")),
    Q(L("Mas village is best known for…", "Desa Mas paling dikenal dengan…"),
      [["Wood carving", "Ukiran kayu"], ["Salt farming", "Tambak garam"], ["Coffee ships", "Kapal kopi"], ["Glass blowing", "Kerajinan kaca tiup"]], 0,
      L("Watch the carvers and buy directly from the maker.", "Lihat para pengukir dan beli langsung dari pengrajin.")),
    Q(L("Pura Taman Saraswati is known for its…", "Pura Taman Saraswati dikenal dengan…"),
      [["Lotus pond", "Kolam teratai"], ["Hot spring", "Pemandian air panas"], ["Cable car", "Kereta gantung"], ["Ice rink", "Arena es"]], 0,
      L("It sits in the middle of Ubud; confirm ceremony schedules locally.", "Berada di tengah Ubud; konfirmasi jadwal upacara secara lokal.")),
    Q(L("Peliatan, next to Ubud, is known for…", "Peliatan, di samping Ubud, dikenal dengan…"),
      [["Balinese dance", "Tari Bali"], ["Container ports", "Pelabuhan peti kemas"], ["Tea plantations", "Kebun teh"], ["Ski slopes", "Lereng ski"]], 0,
      L("Puri Agung Peliatan is a royal palace in this dance village.", "Puri Agung Peliatan adalah puri di desa tari ini.")),
    Q(L("Sumampan Waterfall after heavy rain…", "Air Terjun Sumampan setelah hujan deras…"),
      [["Avoid going: paths and rocks are slippery", "Hindari berkunjung: jalur dan batu licin"], ["Is the best time to swim", "Waktu terbaik untuk berenang"], ["Is always dry", "Selalu kering"], ["Needs no shoes", "Tidak perlu alas kaki"]], 0,
      L("Confirm access and conditions locally.", "Konfirmasi akses dan kondisi secara lokal.")),
  ] },
  green: { title: S.quizGreen, qs: [
    Q(L("Best way to cut plastic waste while travelling?", "Cara terbaik mengurangi sampah plastik saat bepergian?"),
      [["Carry a reusable bottle", "Membawa botol minum isi ulang"], ["Buy bottled water daily", "Membeli air kemasan setiap hari"], ["Use more bags", "Memakai lebih banyak kantong"], ["Leave trash behind", "Meninggalkan sampah"]], 0,
      L("A refillable bottle prevents many single-use bottles.", "Botol isi ulang mencegah banyak botol sekali pakai.")),
    Q(L("Walking through rice terraces, you should…", "Saat berjalan di sawah bertingkat, sebaiknya…"),
      [["Cut across the fields", "Memotong lewat sawah"], ["Stay on paths and respect the farmers", "Tetap di jalur dan hormati petani"], ["Pick the rice", "Memetik padi"], ["Fly a drone over workers", "Menerbangkan drone di atas pekerja"]], 1,
      L("The terraces are working farmland.", "Sawah bertingkat adalah lahan kerja petani.")),
    Q(L("A good way to support the local economy?", "Cara yang baik mendukung ekonomi lokal?"),
      [["Buy from local makers and ask about materials", "Membeli dari pengrajin lokal dan menanyakan bahan"], ["Only shop at big chains", "Hanya belanja di jaringan besar"], ["Bargain to the lowest price always", "Selalu menawar hingga harga terendah"], ["Skip local food", "Melewatkan kuliner lokal"]], 0,
      L("Buying directly helps local families and craft traditions.", "Membeli langsung membantu keluarga lokal dan tradisi kerajinan.")),
    Q(L("There is no bin nearby. What do you do with your litter?", "Tidak ada tempat sampah di dekat Anda. Apa yang Anda lakukan dengan sampah?"),
      [["Take it with you", "Membawanya"], ["Leave it by a shrine", "Meninggalkannya di dekat tempat suci"], ["Throw it in the river", "Membuangnya ke sungai"], ["Bury it in the field", "Menguburnya di sawah"]], 0,
      L("Take your litter with you and sort waste where bins allow.", "Bawa sampah Anda dan pilah sampah jika tersedia tempatnya.")),
    Q(L("Why is handwoven cloth priced higher?", "Mengapa kain tenun tangan harganya lebih tinggi?"),
      [["It takes days to make by hand", "Pembuatannya butuh berhari-hari dengan tangan"], ["It is made by machine", "Dibuat dengan mesin"], ["It is imported", "Diimpor"], ["It is mass produced", "Diproduksi massal"]], 0,
      L("Prices reflect the skill and time of the weaver.", "Harga mencerminkan keahlian dan waktu penenun.")),
    Q(L("Feeding wild monkeys is…", "Memberi makan monyet liar…"),
      [["Not advised: it harms them and can cause bites", "Tidak dianjurkan: merugikan mereka dan bisa menyebabkan gigitan"], ["Encouraged", "Dianjurkan"], ["Good for photos", "Bagus untuk foto"], ["Required", "Wajib"]], 0,
      L("Do not feed the monkeys; keep your distance.", "Jangan memberi makan monyet; jaga jarak.")),
    Q(L("A low-impact way to get around central Ubud?", "Cara berdampak rendah untuk berkeliling pusat Ubud?"),
      [["Walk for short distances", "Berjalan kaki untuk jarak dekat"], ["Drive everywhere", "Berkendara ke mana-mana"], ["Rent a bigger car", "Menyewa mobil lebih besar"], ["Idle the engine while waiting", "Membiarkan mesin menyala saat menunggu"]], 0,
      L("The centre is compact; many sights are a short walk apart.", "Pusat kota cukup ringkas; banyak tempat berjarak dekat.")),
    Q(L("Tri Hita Karana relates to sustainability because it values…", "Tri Hita Karana terkait keberlanjutan karena menjunjung…"),
      [["Balance between people, nature and the divine", "Keseimbangan manusia, alam, dan Tuhan"], ["Fast growth only", "Pertumbuhan cepat saja"], ["Maximum crowds", "Keramaian maksimal"], ["Disposable products", "Produk sekali pakai"]], 0,
      L("It guides daily life from village organisation to farming.", "Filosofi ini memandu keseharian dari tata desa hingga bertani.")),
  ] },
};

/* ───────────────────────── Storage, auth, memory ───────────────────────── */
type User = { id: string; name: string; email: string; hash: string; salt?: string; iter?: number; created?: number };
type UserData = {
  saved: string[]; recent: string[]; searches: string[]; visited: string[];
  quiz: Record<string, number>; joinedCleanup: boolean;
  plan: string[][]; // satu array id per hari
};
const EMPTY: UserData = { saved: [], recent: [], searches: [], visited: [], quiz: {}, joinedCleanup: false, plan: [[]] };
const K = {
  users: "routeubud:users", session: "routeubud:session", lang: "routeubud:lang", suggest: "routeubud:suggestions",
  data: (id: string) => `routeubud:data:${id}`,
  avatar: (id: string) => `routeubud:avatar:${id}`,
  lock: (email: string) => `routeubud:lock:${email}`,
};
async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try { const v = await AsyncStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
/* ── Sistem akun (lokal di perangkat) ──
   Kata sandi di-hash dengan salt acak + iterasi SHA-256; akun lama (hash tanpa salt) otomatis di-upgrade saat login berikutnya.
   Percobaan salah 5x mengunci login 60 detik. Semua data tersimpan di AsyncStorage perangkat ini:
   untuk login lintas perangkat / lupa kata sandi lewat email, ganti objek `authApi` dengan backend (Firebase, Supabase, dsb). */
const ITER = 500;
const okPw = (pw: string) => pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
const legacyHash = (email: string, pw: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `routeubud|${email}|${pw}`);
const randomHex = async (n = 16) => {
  const b = await Crypto.getRandomBytesAsync(n);
  return Array.from(b as Uint8Array).map(x => x.toString(16).padStart(2, "0")).join("");
};
async function derive(pw: string, salt: string, iter = ITER) {
  let h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}|${pw}`);
  for (let i = 1; i < iter; i++) h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${h}|${salt}`);
  return h;
}
const verifyPw = async (u: User, pw: string) =>
  u.salt ? (await derive(pw, u.salt, u.iter ?? ITER)) === u.hash : (await legacyHash(u.email, pw)) === u.hash;

const authApi = {
  async register(name: string, email: string, pw: string): Promise<User> {
    const users = await readJSON<Record<string, User>>(K.users, {});
    if (users[email]) throw new Error("exists");
    const salt = await randomHex();
    const u: User = { id: `u_${Date.now().toString(36)}${salt.slice(0, 4)}`, name, email, hash: await derive(pw, salt), salt, iter: ITER, created: Date.now() };
    users[email] = u;
    for (const key of [K.data, K.avatar]) { // bawa data tamu ke akun baru
      const g = await AsyncStorage.getItem(key("guest"));
      if (g) { await AsyncStorage.setItem(key(u.id), g); await AsyncStorage.removeItem(key("guest")); }
    }
    await AsyncStorage.setItem(K.users, JSON.stringify(users));
    await AsyncStorage.setItem(K.session, email);
    return u;
  },
  async login(email: string, pw: string): Promise<User> {
    const lock = await readJSON<{ n: number; until: number }>(K.lock(email), { n: 0, until: 0 });
    if (lock.until > Date.now()) throw new Error(`locked:${Math.ceil((lock.until - Date.now()) / 1000)}`);
    const users = await readJSON<Record<string, User>>(K.users, {});
    let u = users[email];
    if (!u || !(await verifyPw(u, pw))) {
      const n = lock.n + 1;
      await AsyncStorage.setItem(K.lock(email), JSON.stringify(n >= 5 ? { n: 0, until: Date.now() + 60000 } : { n, until: 0 }));
      throw new Error(n >= 5 ? "locked:60" : "bad");
    }
    await AsyncStorage.removeItem(K.lock(email));
    if (!u.salt) { // upgrade hash lama
      const salt = await randomHex();
      u = { ...u, salt, iter: ITER, hash: await derive(pw, salt) };
      users[email] = u;
      await AsyncStorage.setItem(K.users, JSON.stringify(users));
    }
    await AsyncStorage.setItem(K.session, email);
    return u;
  },
  async updateName(user: User, name: string): Promise<User> {
    const users = await readJSON<Record<string, User>>(K.users, {});
    const u = { ...(users[user.email] ?? user), name };
    users[user.email] = u;
    await AsyncStorage.setItem(K.users, JSON.stringify(users));
    return u;
  },
  async changePassword(user: User, current: string, next: string): Promise<User> {
    const users = await readJSON<Record<string, User>>(K.users, {});
    const stored = users[user.email];
    if (!stored || !(await verifyPw(stored, current))) throw new Error("current");
    const salt = await randomHex();
    const u: User = { ...stored, salt, iter: ITER, hash: await derive(next, salt) };
    users[user.email] = u;
    await AsyncStorage.setItem(K.users, JSON.stringify(users));
    return u;
  },
  async remove(user: User) {
    const users = await readJSON<Record<string, User>>(K.users, {});
    delete users[user.email];
    await AsyncStorage.setItem(K.users, JSON.stringify(users));
    await Promise.all([K.data(user.id), K.avatar(user.id), K.lock(user.email), K.session].map(k => AsyncStorage.removeItem(k)));
  },
};

/* ── Foto profil: pilih/ambil foto, kecilkan, simpan sebagai data URI (aman untuk AsyncStorage & web) ── */
const shrinkWeb = (srcUri: string, size = 384) => new Promise<string>((resolve, reject) => {
  const g: any = globalThis; const img = new g.Image();
  img.onload = () => {
    const s = Math.min(size / img.width, size / img.height, 1);
    const c = g.document.createElement("canvas");
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    resolve(c.toDataURL("image/jpeg", 0.8));
  };
  img.onerror = reject; img.src = srcUri;
});
async function pickAvatar(camera: boolean): Promise<string | null> {
  if (!ImagePicker) throw new Error("pkg");
  const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (Platform.OS !== "web" && !perm.granted) throw new Error("perm");
  const opts: any = {
    mediaTypes: ImagePicker.MediaType ? ["images"] : ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true, aspect: [1, 1], quality: Manipulator ? 0.8 : 0.2, base64: Platform.OS !== "web" && !Manipulator,
  };
  const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  let out: string | null = null;
  if (Platform.OS === "web") out = await shrinkWeb(a.uri);
  else if (Manipulator) {
    const r = await Manipulator.manipulateAsync(a.uri, [{ resize: { width: 384 } }], { compress: 0.7, format: Manipulator.SaveFormat.JPEG, base64: true });
    out = `data:image/jpeg;base64,${r.base64}`;
  } else if (a.base64) out = `data:${a.mimeType ?? "image/jpeg"};base64,${a.base64}`;
  if (out && out.length > 1_200_000) throw new Error("big");
  return out;
}

const GUEST: User = { id: "guest", name: "Traveler", email: "", hash: "" };

function badgesOf(d: UserData) {
  const culturalViews = d.recent.filter(id => byId[id]?.cat === "culture").length;
  const planned = d.plan.reduce((s, day) => s + day.length, 0);
  return [
    { id: "b1", icon: "bookmark-check", title: L("First Save", "Simpanan Pertama"), desc: L("Save your first story", "Simpan cerita pertama"), earned: d.saved.length >= 1 },
    { id: "b2", icon: "map-marker-check", title: L("Explorer", "Penjelajah"), desc: L("Mark a place as visited", "Tandai satu tempat sudah dikunjungi"), earned: d.visited.length >= 1 },
    { id: "b3", icon: "temple-hindu", title: L("Culture Learner", "Pembelajar Budaya"), desc: L("Read 3 culture stories", "Baca 3 cerita budaya"), earned: culturalViews >= 3 },
    { id: "b4", icon: "school", title: L("Quiz Master", "Juara Kuis"), desc: L("Get a perfect quiz score", "Raih nilai kuis sempurna"),
      earned: Object.entries(d.quiz).some(([k, v]) => QUIZZES[k] && v === QUIZZES[k].qs.length) },
    { id: "b5", icon: "leaf", title: L("Green Hero", "Pahlawan Hijau"), desc: L("Join a community clean-up", "Ikut bersih-bersih komunitas"), earned: d.joinedCleanup },
    { id: "b6", icon: "calendar-check", title: L("Trip Planner", "Perencana Perjalanan"), desc: L("Plan 3 stops in your itinerary", "Susun 3 pemberhentian di itinerari"), earned: planned >= 3 },
  ];
}

/* ───────────────────────── Reusable pieces ───────────────────────── */
function BgImage({ source, style, children }: { source: ImageSourcePropType; style?: any; children?: React.ReactNode }) {
  return (
    <View style={[{ overflow: "hidden" }, style]}>
      <Image source={source} resizeMode="cover" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} />
      {children}
    </View>
  );
}

function Logo({ size = 28, color = C.green }: { size?: number; color?: string }) {
  return <Icon name="temple-hindu" size={size} color={color} />;
}

function WaveBand({ height = 96 }: { height?: number }) {
  const { width } = useWindowDimensions();
  const S0 = 58;
  const cols = Math.ceil(width / S0) + 2;
  const rows = 4;
  const circles: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    circles.push(
      <View key={`${r}-${c}`} style={{ position: "absolute", top: r * 20, left: c * S0 - (r % 2) * (S0 / 2) - S0 / 2, width: S0, height: S0, borderRadius: S0 / 2,
        backgroundColor: C.green, borderWidth: 2, borderColor: C.gold, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: S0 - 16, height: S0 - 16, borderRadius: (S0 - 16) / 2, borderWidth: 2, borderColor: C.gold, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: S0 - 32, height: S0 - 32, borderRadius: (S0 - 32) / 2, borderWidth: 2, borderColor: C.gold }} />
        </View>
      </View>
    );
  }
  return <View style={{ height, overflow: "hidden", backgroundColor: C.green }} pointerEvents="none">{circles}</View>;
}

function Pill({ label, on, onPress, color = C.green }: { label: string; on: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 10, paddingHorizontal: 18, marginRight: 8, borderRadius: 22, backgroundColor: on ? color : C.paper, borderWidth: 1, borderColor: on ? color : C.line }}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: on ? onColor(color) : C.ink }}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({ label, onPress, icon, tone = "green", outline = false }: { label: string; onPress: () => void; icon?: string; tone?: "green" | "red"; outline?: boolean }) {
  const color = tone === "red" ? C.red : C.green;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 28, opacity: pressed ? 0.85 : 1, backgroundColor: outline ? "transparent" : color, borderWidth: outline ? 1.5 : 0, borderColor: color })}>
      {icon ? <Icon name={icon} size={18} color={outline ? color : C.white} /> : null}
      <Text style={{ color: outline ? color : C.white, fontWeight: "700", fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

function Bookmark({ on, onPress, floating = false }: { on: boolean; onPress: () => void; floating?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={on ? "Remove bookmark" : "Save"} style={floating ? { position: "absolute", top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(217,204,190,.94)", alignItems: "center", justifyContent: "center" } : undefined}>
      <Icon name={on ? "bookmark" : "bookmark-outline"} size={22} color={on ? C.burgundy : floating ? C.ink : C.muted} />
    </Pressable>
  );
}

function Header({ title, sub, onBack, color, icon }: { title: string; sub: string; onBack?: () => void; color?: string; icon?: string }) {
  const fg = color ? onColor(color) : C.ink;
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: 10 }}>
          <Icon name="chevron-left" size={28} color={C.ink} />
        </Pressable>
      )}
      {color ? (
        <View style={{ backgroundColor: color, borderRadius: 24, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "rgba(199,182,166,.18)", alignItems: "center", justifyContent: "center" }}>
            <Icon name={icon ?? "map-marker"} size={32} color={fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: SERIF, fontSize: 22, fontWeight: "700", color: fg }}>{title}</Text>
            <Text style={{ fontSize: 13, color: fg, opacity: 0.9, marginTop: 3 }}>{sub}</Text>
          </View>
        </View>
      ) : (
        <>
          <Text style={{ fontFamily: SERIF, fontSize: 28, color: C.ink, fontWeight: "700" }}>{title}</Text>
          <Text style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{sub}</Text>
        </>
      )}
    </View>
  );
}

function OverlayCard({ item, saved, onOpen, onSave, width }: { item: Item; saved: boolean; onOpen: () => void; onSave: () => void; width?: number }) {
  const { t } = useT();
  return (
    <Pressable onPress={onOpen} style={{ width: width ?? "100%", marginRight: width ? 12 : 0, marginBottom: width ? 0 : 14, borderRadius: 20, overflow: "hidden", backgroundColor: C.sage }}>
      <BgImage source={sized(item.image, width ? 480 : 800)} style={{ height: width ? 130 : 156, justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "rgba(14,20,16,.58)", padding: 12 }}>
          <Text style={{ fontFamily: SERIF, color: C.white, fontWeight: "700", fontSize: width ? 14 : 17 }} numberOfLines={1}>{t(item.title)}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
            {item.rating ? <Icon name="star" size={13} color={C.star} /> : null}
            <Text style={{ color: C.white, fontSize: 12 }} numberOfLines={1}>
              {item.rating ? `${item.rating}${item.mins ? `  ·  ${t(S.min(item.mins))}` : ""}  ·  ` : ""}{t(item.loc)}
            </Text>
          </View>
        </View>
        <Bookmark on={saved} onPress={onSave} floating />
      </BgImage>
    </Pressable>
  );
}

function StoryCard({ item, saved, onOpen, onSave }: { item: Item; saved: boolean; onOpen: () => void; onSave: () => void }) {
  const { t } = useT();
  return (
    <Pressable onPress={onOpen} style={{ backgroundColor: C.paper, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: C.line, marginBottom: 14 }}>
      <View>
        <Image source={sized(item.image, 800)} style={{ height: 150, width: "100%", backgroundColor: C.sage }} />
        <Bookmark on={saved} onPress={onSave} floating />
      </View>
      <View style={{ padding: 14 }}>
        <Text style={{ fontSize: 12, color: INK[item.cat], fontWeight: "700" }}>{t(KIND[item.kind])}</Text>
        <Text style={{ fontFamily: SERIF, fontSize: 18, color: C.ink, fontWeight: "700", marginTop: 3 }}>{t(item.title)}</Text>
        <Text style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 19 }} numberOfLines={2}>{t(item.body)}</Text>
      </View>
    </Pressable>
  );
}

function ItemRow({ item, saved, onOpen, onSave }: { item: Item; saved: boolean; onOpen: () => void; onSave: () => void }) {
  const { t } = useT();
  return (
    <Pressable onPress={onOpen} style={{ flexDirection: "row", backgroundColor: C.paper, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: C.line, marginBottom: 12 }}>
      <Image source={sized(item.image, 320)} style={{ width: 92, height: 92, backgroundColor: C.sage }} />
      <View style={{ flex: 1, padding: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 12, color: INK[item.cat], fontWeight: "700" }}>{t(KIND[item.kind])}</Text>
        <Text style={{ fontFamily: SERIF, fontSize: 16, color: C.ink, fontWeight: "700", marginTop: 3 }} numberOfLines={2}>{t(item.title)}</Text>
        <Text style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{t(item.loc)}</Text>
      </View>
      <View style={{ padding: 12 }}><Bookmark on={saved} onPress={onSave} /></View>
    </Pressable>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingBottom: 8 }}>
          <Text style={{ fontFamily: SERIF, fontSize: 24, color: C.ink, fontWeight: "700", flex: 1 }}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={20} color={C.ink} />
          </Pressable>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function QuizSheet({ quizId, onClose, onDone }: { quizId: string; onClose: () => void; onDone: (id: string, score: number) => void }) {
  const { t } = useT();
  const quiz = QUIZZES[quizId];
  const qs = useMemo(() => shuffle(quiz.qs), [quizId]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = qs[i];
  const choose = (n: number) => { if (pick !== null) return; setPick(n); if (n === q.ans) setScore(s => s + 1); };
  const next = () => {
    if (i + 1 < qs.length) { setI(i + 1); setPick(null); }
    else { setDone(true); onDone(quizId, score); }
  };
  return (
    <Sheet title={t(quiz.title)} onClose={onClose}>
      {done ? (
        <View style={{ alignItems: "center", paddingTop: 30 }}>
          <Icon name={score === qs.length ? "trophy" : "book-open-variant"} size={64} color={C.gold} />
          <Text style={{ fontFamily: SERIF, fontSize: 22, color: C.ink, fontWeight: "700", marginTop: 16 }}>{t(S.score(score, qs.length))}</Text>
          <Text style={{ color: C.muted, textAlign: "center", marginTop: 8, lineHeight: 21 }}>{t(score === qs.length ? S.perfect : S.tryAgain)}</Text>
          <View style={{ marginTop: 24, alignSelf: "stretch" }}><PrimaryButton label={t(S.close)} onPress={onClose} /></View>
        </View>
      ) : (
        <View>
          <Text style={{ color: C.muted, fontSize: 13 }}>{i + 1} / {qs.length}</Text>
          <Text style={{ fontFamily: SERIF, fontSize: 21, color: C.ink, fontWeight: "700", marginTop: 8, lineHeight: 28 }}>{t(q.q)}</Text>
          <View style={{ marginTop: 18, gap: 10 }}>
            {q.opts.map((o, n) => {
              const show = pick !== null;
              const right = show && n === q.ans;
              const bad = show && n === pick && n !== q.ans;
              return (
                <Pressable key={n} onPress={() => choose(n)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 15, borderRadius: 14, borderWidth: 1.5,
                  borderColor: right ? C.green2 : bad ? C.red : C.line, backgroundColor: right ? C.sage : bad ? C.errBg : C.paper }}>
                  <Icon name={right ? "check-circle" : bad ? "close-circle" : "circle-outline"} size={22} color={right ? C.green2 : bad ? C.red : C.muted} />
                  <Text style={{ flex: 1, color: C.ink, fontSize: 15 }}>{t(o)}</Text>
                </Pressable>
              );
            })}
          </View>
          {pick !== null && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontWeight: "700", color: pick === q.ans ? C.green2 : C.red }}>{t(pick === q.ans ? S.correct : S.wrong)}</Text>
              <Text style={{ color: C.ink, marginTop: 4, lineHeight: 21 }}>{t(q.why)}</Text>
              <View style={{ marginTop: 16 }}><PrimaryButton label={t(i + 1 < qs.length ? S.next : S.finish)} onPress={next} /></View>
            </View>
          )}
        </View>
      )}
    </Sheet>
  );
}

function QuizCard({ id, color, best, onStart }: { id: string; color: string; best?: number; onStart: () => void }) {
  const { t } = useT();
  const q = QUIZZES[id];
  return (
    <Pressable onPress={onStart} style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.goldSoft, borderRadius: 20, padding: 18, marginTop: 6, marginBottom: 8 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
        <Icon name="school" size={26} color={onColor(color)} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: SERIF, fontSize: 17, color: C.ink, fontWeight: "700" }}>{t(q.title)}</Text>
        <Text style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>
          {t(S.questions(q.qs.length))}{best !== undefined ? `  ·  ${t(S.best(best, q.qs.length))}` : ""}
        </Text>
      </View>
      <Text style={{ color: color, fontWeight: "800", fontSize: 14 }}>{t(S.takeQuiz)} →</Text>
    </Pressable>
  );
}

/* Suggestion box: saved on the device, and optionally emailed (see SUGGEST_EMAIL at the top). */
function SuggestionSheet({ name, onClose }: { name: string; onClose: () => void }) {
  const { t } = useT();
  const [type, setType] = useState<"tourism" | "app">("tourism");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  const send = async () => {
    const msg = text.trim();
    if (msg.length < 5) return setErr(t(S.errShort));
    setErr("");
    const list = await readJSON<any[]>(K.suggest, []);
    list.unshift({ id: Date.now().toString(36), type, text: msg, name, at: new Date().toISOString() });
    try { await AsyncStorage.setItem(K.suggest, JSON.stringify(list)); } catch {}
    if (SUGGEST_EMAIL) {
      const subject = `RouteUbud suggestion (${type === "tourism" ? "Ubud tourism" : "App development"})`;
      Linking.openURL(`mailto:${SUGGEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${msg}\n\n— ${name}`)}`).catch(() => {});
    }
    setSent(true);
  };

  return (
    <Sheet title={t(S.suggest)} onClose={onClose}>
      {sent ? (
        <View style={{ alignItems: "center", paddingTop: 30 }}>
          <Icon name="check-circle" size={64} color={C.green2} />
          <Text style={{ fontFamily: SERIF, fontSize: 22, color: C.ink, fontWeight: "700", marginTop: 16 }}>{t(S.thanks)}</Text>
          <Text style={{ color: C.muted, textAlign: "center", marginTop: 8, lineHeight: 21 }}>{t(S.thanksMsg)}</Text>
          <View style={{ marginTop: 24, alignSelf: "stretch", gap: 12 }}>
            <PrimaryButton outline label={t(S.another)} onPress={() => { setText(""); setSent(false); }} />
            <PrimaryButton label={t(S.close)} onPress={onClose} />
          </View>
        </View>
      ) : (
        <View>
          <Text style={{ color: C.muted, lineHeight: 21, marginBottom: 14 }}>{t(S.suggestSub)}</Text>
          <View style={{ flexDirection: "row" }}>
            <Pill label={t(S.suggestTourism)} on={type === "tourism"} onPress={() => setType("tourism")} color={C.padi} />
            <Pill label={t(S.suggestApp)} on={type === "app"} onPress={() => setType("app")} color={C.lawar} />
          </View>
          <TextInput value={text} onChangeText={setText} placeholder={t(S.suggestPh)} placeholderTextColor={C.muted} multiline textAlignVertical="top" maxLength={1000}
            style={{ marginTop: 14, minHeight: 150, backgroundColor: C.paper, borderRadius: 16, padding: 16, fontSize: 15, color: C.ink, borderWidth: 1, borderColor: C.line }} />
          {err ? <Text style={{ color: C.red, marginTop: 10, fontSize: 13 }}>{err}</Text> : null}
          <View style={{ marginTop: 18 }}><PrimaryButton label={t(S.send)} icon="send" onPress={send} /></View>
        </View>
      )}
    </Sheet>
  );
}

/* ───────────────────────── Peta ───────────────────────── */
const MAP_FILTERS: [string, L][] = [["all", S.all], ["nature", KIND.nature], ["culture", KIND.culture], ["temple", KIND.temple], ["food", KIND.food], ["craft", S.craft], ["plan", S.myPlan]];
const inFilter = (i: Item, f: string) => f === "all" || (f === "craft" ? i.kind === "handicraft" || i.kind === "fashion" : i.kind === f);

function DayPills({ count, day, onPick, color }: { count: number; day: number; onPick: (n: number) => void; color: string }) {
  const { t } = useT();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}>
      {Array.from({ length: count }, (_, n) => <Pill key={n} label={t(S.day(n + 1))} on={day === n} onPress={() => onPick(n)} color={color} />)}
    </ScrollView>
  );
}

function MapScreen({ filter, setFilter, plan, planDay, setPlanDay, focus, onOpen, onAdd, isPlanned, rowProps }: {
  filter: string; setFilter: (f: string) => void; plan: string[][]; planDay: number; setPlanDay: (n: number) => void;
  focus: string | null; onOpen: (i: Item) => void; onAdd: (i: Item) => void; isPlanned: (id: string) => boolean; rowProps: (i: Item) => any;
}) {
  const { t } = useT();
  const ref = useRef<any>(null);
  const first = useRef(true);
  const [sel, setSel] = useState<string | null>(focus);
  const planItems = (plan[planDay] ?? []).map(id => byId[id]).filter(i => i && GEO[i.id]);
  const shown = filter === "plan" ? planItems : MAPPED.filter(i => inFilter(i, filter));
  const key = shown.map(i => i.id).join(",");
  const fit = useCallback(() => {
    const cs = shown.map(i => ({ latitude: GEO[i.id].lat, longitude: GEO[i.id].lng }));
    if (cs.length && ref.current) ref.current.fitToCoordinates(cs, { edgePadding: { top: 70, right: 60, bottom: 230, left: 60 }, animated: true });
  }, [key]);
  useEffect(() => { if (first.current) { first.current = false; if (focus) return; } fit(); }, [key]);
  useEffect(() => {
    if (focus && GEO[focus]) {
      setSel(focus);
      ref.current?.animateToRegion({ latitude: GEO[focus].lat, longitude: GEO[focus].lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 500);
    }
  }, [focus]);

  const head = (
    <>
      <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
        <Text style={{ fontFamily: SERIF, fontSize: 26, color: C.ink, fontWeight: "700" }}>{t(S.mapTitle)}</Text>
        <Text style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{t(S.mapSub)}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}>
        {MAP_FILTERS.map(([k, l]) => <Pill key={k} label={t(l)} on={filter === k} onPress={() => setFilter(k)} color={C.burgundy} />)}
      </ScrollView>
      {filter === "plan" && <DayPills count={plan.length} day={planDay} onPick={setPlanDay} color={C.green} />}
    </>
  );

  if (!RNMaps) {
    const mapPoints = shown.map((i, n) => ({
      id: i.id, name: i.title.en, kind: KIND[i.kind]?.en ?? i.kind, color: kindColor(i.kind), fg: onColor(kindColor(i.kind)),
      lat: GEO[i.id].lat, lng: GEO[i.id].lng, image: (sized(i.image, 400) as any)?.uri ?? "",
      order: n + 1, approx: !!GEO[i.id].approx,
    }));
    const routePoints = filter === "plan" ? planItems.map(i => [GEO[i.id].lat, GEO[i.id].lng]) : [];
    const mapHtml = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;width:100%;margin:0;background:#C7B6A6}.leaflet-popup-content-wrapper{border-radius:12px}.leaflet-popup-content{margin:10px;font:13px Arial}.pin{border:2px solid #C7B6A6;border-radius:50%;width:30px;height:30px;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:0 2px 7px #3338}.leaflet-control-attribution{font-size:9px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
      const points=${JSON.stringify(mapPoints)}; const route=${JSON.stringify(routePoints)};
      const map=L.map('map',{scrollWheelZoom:true}).setView([-8.5069,115.2625],13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
      const bounds=[];
      points.forEach(p=>{const marker=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'',html:'<div class="pin" style="background:'+p.color+';color:'+p.fg+'">'+( ${JSON.stringify(filter)}==='plan'?p.order:'•')+'</div>',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(map);
      marker.bindPopup('<div style="width:190px"><img src="'+p.image+'" style="width:100%;height:95px;object-fit:cover;border-radius:8px" onerror="this.remove()"><b>'+p.name+'</b><div style="color:#4A4138;margin-top:3px">'+p.kind+(p.approx?' · approximate pin':'')+'</div><a target="_blank" href="https://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lng+'">Open in Google Maps</a></div>'); bounds.push([p.lat,p.lng]);});
      if(route.length>1)L.polyline(route,{color:'#4B2328',weight:4,opacity:.8}).addTo(map);
      if(bounds.length>1)map.fitBounds(bounds,{padding:[28,28]});else if(bounds.length===1)map.setView(bounds[0],15);
    </script></body></html>`;
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {head}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>{t(S.mapWeb)}</Text>
          <View style={{ height: 430, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: C.line, marginBottom: 18, backgroundColor: C.sage }}>
            {React.createElement("iframe" as any, { title: "RouteUbud interactive map", srcDoc: mapHtml, style: { width: "100%", height: "100%", border: 0 }, loading: "lazy", allowFullScreen: true })}
          </View>
          {shown.length === 0 ? <Text style={{ color: C.muted }}>{t(S.noGeo)}</Text> : shown.map(i => (
            <View key={i.id}>
              <ItemRow {...rowProps(i)} />
              <Pressable onPress={() => openRoute([i])} style={{ marginTop: -6, marginBottom: 12, paddingVertical: 4 }}>
                <Text style={{ color: C.burgundy, fontWeight: "700", fontSize: 13 }}>{t(S.openMaps)} →</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  const MapV = RNMaps.default ?? RNMaps.MapView;
  const { Marker, Polyline } = RNMaps;
  const selItem = sel ? byId[sel] : null;
  const g = selItem ? GEO[selItem.id] : null;
  return (
    <View style={{ flex: 1 }}>
      {head}
      <View style={{ flex: 1 }}>
        <MapV ref={ref} style={{ flex: 1 }} onMapReady={() => { if (!focus) fit(); }} onPress={() => setSel(null)}
          initialRegion={{ latitude: CENTER.lat, longitude: CENTER.lng, latitudeDelta: 0.22, longitudeDelta: 0.22 }}>
          {filter === "plan" && planItems.length > 1 && (
            <Polyline coordinates={planItems.map(i => ({ latitude: GEO[i.id].lat, longitude: GEO[i.id].lng }))} strokeColor={C.burgundy} strokeWidth={3} />
          )}
          {shown.map((i, n) => {
            const on = sel === i.id;
            const s = on ? 42 : 34;
            return (
              <Marker key={i.id} coordinate={{ latitude: GEO[i.id].lat, longitude: GEO[i.id].lng }} onPress={(e: any) => { e?.stopPropagation?.(); setSel(i.id); }}>
                <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: kindColor(i.kind), borderWidth: 2, borderColor: C.cream, alignItems: "center", justifyContent: "center" }}>
                  {filter === "plan"
                    ? <Text style={{ color: onColor(kindColor(i.kind)), fontWeight: "800" }}>{n + 1}</Text>
                    : <Icon name={kindIcon(i.kind)} size={on ? 22 : 18} color={onColor(kindColor(i.kind))} />}
                </View>
              </Marker>
            );
          })}
        </MapV>
        {shown.length === 0 && (
          <View style={{ position: "absolute", top: 16, left: 20, right: 20, backgroundColor: C.paper, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.line }}>
            <Text style={{ color: C.muted }}>{t(S.noGeo)}</Text>
          </View>
        )}
        {selItem && g && (
          <View style={{ ...SOFT, position: "absolute", left: 16, right: 16, bottom: 16, backgroundColor: C.paper, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: C.line }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Image source={sized(selItem.image, 240)} style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: C.sage }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: kindColor(selItem.kind) }}>{t(KIND[selItem.kind])}</Text>
                <Text style={{ fontFamily: SERIF, fontSize: 17, color: C.ink, fontWeight: "700", marginTop: 2 }} numberOfLines={2}>{t(selItem.title)}</Text>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{t(selItem.loc)}</Text>
              </View>
              <Pressable onPress={() => setSel(null)} hitSlop={10}><Icon name="close" size={20} color={C.muted} /></Pressable>
            </View>
            {g.approx && <Text style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{t(S.approx)}</Text>}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <View style={{ flex: 1 }}><PrimaryButton outline label={t(S.details)} onPress={() => onOpen(selItem)} /></View>
              <View style={{ flex: 1 }}><PrimaryButton label={t(isPlanned(selItem.id) ? S.inPlan : S.addPlan)} icon={isPlanned(selItem.id) ? "check" : "plus"} onPress={() => onAdd(selItem)} /></View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

/* ───────────────────────── Akun: avatar, kolom sandi, edit profil ───────────────────────── */
function Avatar({ uri, name, size = 88 }: { uri?: string | null; name: string; size?: number }) {
  const common = { width: size, height: size, borderRadius: size / 2, borderWidth: size > 60 ? 3 : 1.5, borderColor: C.sage2 } as const;
  if (uri) return <Image source={{ uri }} style={{ ...common, backgroundColor: C.sage }} />;
  return (
    <View style={{ ...common, backgroundColor: C.burgundy, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: SERIF, fontSize: size * 0.43, color: C.white, fontWeight: "700" }}>{(name.trim().charAt(0) || "T").toUpperCase()}</Text>
    </View>
  );
}

const fieldStyle = { backgroundColor: C.paper, borderRadius: 14, padding: 15, fontSize: 15, color: C.ink, marginTop: 12, borderWidth: 1, borderColor: C.line } as const;

function PwField({ value, onChange, placeholder, onSubmit }: { value: string; onChange: (v: string) => void; placeholder: string; onSubmit?: () => void }) {
  const { t } = useT();
  const [show, setShow] = useState(false);
  return (
    <View style={{ ...fieldStyle, padding: 0, flexDirection: "row", alignItems: "center" }}>
      <TextInput value={value} onChangeText={onChange} onSubmitEditing={onSubmit} placeholder={placeholder} placeholderTextColor={C.muted}
        secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} style={{ flex: 1, padding: 15, fontSize: 15, color: C.ink }} />
      <Pressable onPress={() => setShow(s => !s)} hitSlop={10} accessibilityLabel={t(show ? S.hidePw : S.showPw)} style={{ paddingHorizontal: 14 }}>
        <Icon name={show ? "eye-off-outline" : "eye-outline"} size={22} color={C.muted} />
      </Pressable>
    </View>
  );
}

function EditProfileSheet({ user, avatar, isGuest, onPhoto, onName, onClose }: {
  user: User; avatar: string | null; isGuest: boolean; onPhoto: (uri: string | null) => Promise<void>; onName: (n: string) => Promise<void>; onClose: () => void;
}) {
  const { t } = useT();
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const run = async (camera: boolean) => {
    setBusy(true); setMsg("");
    try { const uri = await pickAvatar(camera); if (uri) await onPhoto(uri); }
    catch (e: any) { Alert.alert(t(e?.message === "pkg" ? S.photoPkg : e?.message === "perm" ? S.photoPerm : S.photoErr)); }
    finally { setBusy(false); }
  };
  const saveName = async () => {
    const n = name.trim();
    if (!n) return setMsg(t(S.errName));
    await onName(n); setMsg(t(S.nameSaved));
  };
  return (
    <Sheet title={t(S.editProfile)} onClose={onClose}>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Avatar uri={avatar} name={name} size={120} />
        {busy && <ActivityIndicator color={C.green} style={{ marginTop: 12 }} />}
      </View>
      <View style={{ gap: 10 }}>
        <PrimaryButton label={t(S.choosePhoto)} icon="image-outline" onPress={() => run(false)} />
        {Platform.OS !== "web" && <PrimaryButton outline label={t(S.takePhoto)} icon="camera-outline" onPress={() => run(true)} />}
        {avatar && <PrimaryButton outline tone="red" label={t(S.removePhoto)} icon="trash-can-outline" onPress={() => onPhoto(null)} />}
      </View>
      {!isGuest && (
        <View style={{ marginTop: 22 }}>
          <Text style={{ fontWeight: "700", color: C.ink }}>{t(S.displayName)}</Text>
          <TextInput value={name} onChangeText={setName} placeholder={t(S.name)} placeholderTextColor={C.muted} style={fieldStyle} />
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>{user.email}</Text>
          <View style={{ marginTop: 14 }}><PrimaryButton label={t(S.saveChanges)} onPress={saveName} /></View>
        </View>
      )}
      {msg ? <Text style={{ color: C.green2, marginTop: 12, fontWeight: "600" }}>{msg}</Text> : null}
    </Sheet>
  );
}

function PasswordSheet({ onSubmit, onClose }: { onSubmit: (cur: string, next: string) => Promise<void>; onClose: () => void }) {
  const { t } = useT();
  const [cur, setCur] = useState(""); const [next, setNext] = useState(""); const [next2, setNext2] = useState("");
  const [err, setErr] = useState(""); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr("");
    if (!okPw(next)) return setErr(t(S.errPw8));
    if (next !== next2) return setErr(t(S.errConfirm));
    setBusy(true);
    try { await onSubmit(cur, next); setOk(true); setCur(""); setNext(""); setNext2(""); }
    catch (e: any) { setErr(t(e?.message === "current" ? S.errCurrent : S.errBad)); }
    finally { setBusy(false); }
  };
  return (
    <Sheet title={t(S.changePassword)} onClose={onClose}>
      <PwField value={cur} onChange={setCur} placeholder={t(S.currentPw)} />
      <PwField value={next} onChange={setNext} placeholder={t(S.newPw)} />
      <PwField value={next2} onChange={setNext2} placeholder={t(S.confirmPw)} onSubmit={submit} />
      <Text style={{ color: C.muted, fontSize: 12, marginTop: 10 }}>{t(S.pwHint)}</Text>
      {err ? <Text style={{ color: C.red, marginTop: 10, fontSize: 13 }}>{err}</Text> : null}
      {ok ? <Text style={{ color: C.green2, marginTop: 10, fontWeight: "700" }}>{t(S.pwChanged)}</Text> : null}
      <View style={{ marginTop: 18 }}>{busy ? <ActivityIndicator color={C.green} /> : <PrimaryButton label={t(S.saveChanges)} onPress={submit} />}</View>
    </Sheet>
  );
}

/* Grid responsif: 1 kolom di ponsel, 2–3 kolom di tablet/desktop */
function Grid({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const cols = width >= 1100 ? 3 : width >= 720 ? 2 : 1;
  const kids = React.Children.toArray(children);
  if (cols === 1) return <>{kids}</>;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
      {kids.map((k, n) => <View key={n} style={{ width: `${100 / cols}%`, paddingHorizontal: 6 }}>{k}</View>)}
    </View>
  );
}

/* ───────────────────────── Splash, language, auth ───────────────────────── */
function SplashScreen() {
  const { t } = useT();
  return (
    <View style={{ flex: 1, backgroundColor: C.green }}>
      <StatusBar barStyle="light-content" />
      <BgImage source={{ uri: IMG.terrace }} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: "rgba(14,51,37,.72)", alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
          <Logo size={96} color={C.cream} />
          <Text style={{ fontFamily: SERIF, fontSize: 44, color: C.cream, fontWeight: "700", marginTop: 8 }}>RouteUbud</Text>
          <Text style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: C.cream, textAlign: "center", marginTop: 10, lineHeight: 23 }}>{t(S.tagline)}</Text>
        </View>
        <WaveBand />
      </BgImage>
    </View>
  );
}

function LanguageScreen({ initial, onDone }: { initial: Lang; onDone: (l: Lang) => void }) {
  const [sel, setSel] = useState<Lang>(initial);
  const opts: { code: Lang; flag: string; name: string; sub: L }[] = [
    { code: "id", flag: "🇮🇩", name: "Bahasa Indonesia", sub: S.forLocal },
    { code: "en", flag: "🇬🇧", name: "English", sub: S.forIntl },
  ];
  const tt = (l: L) => l[sel];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream, paddingTop: TOP }}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1, padding: 26, justifyContent: "center" }}>
        <View style={{ alignItems: "center" }}>
          <Logo size={64} />
          <Text style={{ fontFamily: SERIF, fontSize: 28, color: C.ink, fontWeight: "700", marginTop: 14 }}>{tt(S.chooseLang)}</Text>
          <Text style={{ color: C.muted, textAlign: "center", marginTop: 8, lineHeight: 21 }}>{tt(S.selectLang)}</Text>
        </View>
        <View style={{ marginTop: 28, gap: 12 }}>
          {opts.map(o => (
            <Pressable key={o.code} onPress={() => setSel(o.code)} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, backgroundColor: C.paper, borderWidth: 1.5, borderColor: sel === o.code ? C.green : C.line }}>
              <Text style={{ fontSize: 30 }}>{o.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink }}>{o.name}</Text>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{o.sub[o.code]}</Text>
              </View>
              <Icon name={sel === o.code ? "check-circle" : "circle-outline"} size={26} color={sel === o.code ? C.green : C.line} />
            </Pressable>
          ))}
        </View>
        <View style={{ marginTop: 26 }}><PrimaryButton label={tt(S.continue)} onPress={() => onDone(sel)} icon="arrow-right" /></View>
      </View>
    </SafeAreaView>
  );
}

function AuthScreen({ onAuthed, onGuest }: { onAuthed: (u: User) => void; onGuest: () => void }) {
  const { t } = useT();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  const errText = (e: any) => {
    const m = String(e?.message ?? "");
    if (m === "exists") return t(S.errExists);
    if (m.startsWith("locked:")) return t(S.errLocked(Number(m.split(":")[1])));
    return t(S.errBad);
  };
  const submit = async () => {
    if (busy) return;
    setErr("");
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setErr(t(S.errEmail));
    if (mode === "register") {
      if (!name.trim()) return setErr(t(S.errName));
      if (!okPw(pw)) return setErr(t(S.errPw8));
      if (pw !== pw2) return setErr(t(S.errConfirm));
    } else if (!pw) return setErr(t(S.errBad));
    setBusy(true);
    try {
      const u = mode === "register" ? await authApi.register(name.trim(), e, pw) : await authApi.login(e, pw);
      onAuthed(u);
    } catch (x) { setErr(errText(x)); setBusy(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream, paddingTop: TOP }}>
      <StatusBar barStyle="dark-content" />
      <Icon name="flower" size={220} color={C.sage} style={{ position: "absolute", top: -60, right: -70, opacity: 0.5 }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 26, width: "100%", maxWidth: 480, alignSelf: "center" }} keyboardShouldPersistTaps="handled">
          <Logo size={56} />
          <Text style={{ fontFamily: SERIF, fontSize: 34, color: C.green, fontWeight: "700", marginTop: 12 }}>RouteUbud</Text>
          <Text style={{ fontFamily: SERIF, fontStyle: "italic", color: C.muted, marginTop: 4 }}>{t(S.motto)}</Text>
          <View style={{ flexDirection: "row", marginTop: 26 }}>
            <Pill label={t(S.login)} on={mode === "login"} onPress={() => { setMode("login"); setErr(""); }} />
            <Pill label={t(S.register)} on={mode === "register"} onPress={() => { setMode("register"); setErr(""); }} />
          </View>
          <Text style={{ fontFamily: SERIF, fontSize: 22, color: C.ink, fontWeight: "700", marginTop: 14 }}>{t(mode === "login" ? S.loginTitle : S.registerTitle)}</Text>
          {mode === "register" && <TextInput value={name} onChangeText={setName} placeholder={t(S.name)} placeholderTextColor={C.muted} autoComplete="name" style={fieldStyle} />}
          <TextInput value={email} onChangeText={setEmail} placeholder={t(S.email)} placeholderTextColor={C.muted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" style={fieldStyle} />
          <PwField value={pw} onChange={setPw} placeholder={t(S.password)} onSubmit={mode === "login" ? submit : undefined} />
          {mode === "register" && (
            <>
              <PwField value={pw2} onChange={setPw2} placeholder={t(S.confirmPw)} onSubmit={submit} />
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>{t(S.pwHint)}</Text>
            </>
          )}
          {err ? <Text style={{ color: C.red, marginTop: 10, fontSize: 13, fontWeight: "600" }}>{err}</Text> : null}
          <View style={{ marginTop: 18 }}>
            {busy ? <ActivityIndicator color={C.green} /> : <PrimaryButton label={t(mode === "login" ? S.login : S.register)} onPress={submit} />}
          </View>
          <Pressable onPress={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }} style={{ marginTop: 16, alignItems: "center" }}>
            <Text style={{ color: C.burgundy, fontWeight: "600" }}>{t(mode === "login" ? S.toRegister : S.toLogin)}</Text>
          </Pressable>
          <View style={{ marginTop: 22, paddingTop: 20, borderTopWidth: 1, borderTopColor: C.line }}>
            <PrimaryButton outline label={t(S.guest)} icon="account-outline" onPress={onGuest} />
            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 10 }}>{t(S.guestNote)}</Text>
            <Text style={{ color: C.muted, fontSize: 12, textAlign: "center", marginTop: 6 }}>{t(S.localNote)}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ───────────────────────── Main app ───────────────────────── */
type Phase = "splash" | "lang" | "auth" | "app";
type Screen = "home" | "explore" | "culture" | "wear" | "umkm" | "act" | "map" | "plan" | "saved" | "profile";
type SheetKey = "trips" | "badges" | "settings" | "help" | "about" | "more" | "suggest" | "editProfile" | "password" | null;

export default function App() {
  const { width: viewportWidth } = useWindowDimensions();
  const isDesktop = viewportWidth >= 900;
  const contentMaxWidth = isDesktop ? 1180 : "100%";
  const [phase, setPhase] = useState<Phase>("splash");
  const [lang, setLangState] = useState<Lang>("en");
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<UserData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [active, setActive] = useState<Item | null>(null);
  const [sheet, setSheet] = useState<SheetKey>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [placeFilter, setPlaceFilter] = useState("all");
  const [cultureTab, setCultureTab] = useState("tradition");
  const [wearTab, setWearTab] = useState("dress");
  const [umkmFilter, setUmkmFilter] = useState("all");
  const [mapFilter, setMapFilter] = useState("all");
  const [mapFocus, setMapFocus] = useState<string | null>(null);
  const [planDay, setPlanDay] = useState(0);
  const [avatar, setAvatar] = useState<string | null>(null);
  const skipSave = useRef(false);
  const scroller = useRef<ScrollView>(null);

  const t = useCallback((l: L) => l[lang], [lang]);
  const ctx = useMemo(() => ({ lang, t }), [lang, t]);

  const setLang = (l: Lang) => { setLangState(l); AsyncStorage.setItem(K.lang, l).catch(() => {}); };

  const loadUser = async (u: User) => {
    const d = await readJSON<UserData>(K.data(u.id), EMPTY);
    setData({ ...EMPTY, ...d, plan: d.plan?.length ? d.plan : [[]] });
    setPlanDay(0);
    setAvatar(await AsyncStorage.getItem(K.avatar(u.id)).catch(() => null));
    setUser(u);
    setLoaded(true);
  };

  useEffect(() => {
    (async () => {
      const [l, email] = await Promise.all([AsyncStorage.getItem(K.lang), AsyncStorage.getItem(K.session)]);
      let u: User | null = null;
      if (email === "guest") u = GUEST;
      else if (email) { const users = await readJSON<Record<string, User>>(K.users, {}); u = users[email] ?? null; }
      if (l === "en" || l === "id") setLangState(l);
      if (u) await loadUser(u);
      await new Promise(r => setTimeout(r, 1200));
      setPhase(!l ? "lang" : u ? "app" : "auth");
    })();
  }, []);

  // Simpan data pengguna dengan debounce supaya tidak menulis ke storage di setiap ketukan.
  useEffect(() => {
    if (!user || !loaded) return;
    const id = setTimeout(() => AsyncStorage.setItem(K.data(user.id), JSON.stringify(data)).catch(() => {}), 350);
    return () => clearTimeout(id);
  }, [data, user, loaded]);

  // Web: judul tab & warna browser sesuai brand.
  useEffect(() => {
    const doc = (globalThis as any).document;
    if (Platform.OS !== "web" || !doc) return;
    doc.title = "RouteUbud — Explore the Culture, Preserve the Future";
    let m = doc.querySelector('meta[name="theme-color"]');
    if (!m) { m = doc.createElement("meta"); m.setAttribute("name", "theme-color"); doc.head.appendChild(m); }
    m.setAttribute("content", C.green);
  }, []);

  const logout = async () => {
    if (user && loaded && !skipSave.current) await AsyncStorage.setItem(K.data(user.id), JSON.stringify(data)).catch(() => {});
    skipSave.current = false;
    await AsyncStorage.removeItem(K.session);
    setAvatar(null);
    setUser(null); setLoaded(false); setData(EMPTY); setScreen("home"); setActive(null); setSheet(null); setQuery(""); setPlanDay(0);
    setPhase("auth");
  };

  const setPhoto = async (uri: string | null) => {
    if (!user) return;
    try {
      if (uri) await AsyncStorage.setItem(K.avatar(user.id), uri); else await AsyncStorage.removeItem(K.avatar(user.id));
      setAvatar(uri);
    } catch { Alert.alert(t(S.photoErr)); }
  };
  const saveName = async (name: string) => { if (user && user.id !== "guest") setUser(await authApi.updateName(user, name)); };
  const changePw = async (cur: string, next: string) => { if (user && user.id !== "guest") setUser(await authApi.changePassword(user, cur, next)); };
  const deleteAccount = () => Alert.alert(t(S.deleteAccount), t(S.deleteMsg), [
    { text: t(S.cancel), style: "cancel" },
    { text: t(S.deleteAccount), style: "destructive", onPress: async () => { if (user) await authApi.remove(user); skipSave.current = true; await logout(); } },
  ]);

  const toggleSave = useCallback((id: string) =>
    setData(d => ({ ...d, saved: d.saved.includes(id) ? d.saved.filter(x => x !== id) : [id, ...d.saved] })), []);
  const toggleVisited = (id: string) =>
    setData(d => ({ ...d, visited: d.visited.includes(id) ? d.visited.filter(x => x !== id) : [id, ...d.visited] }));
  const openItem = (item: Item) => {
    setActive(item);
    setData(d => ({ ...d, recent: [item.id, ...d.recent.filter(x => x !== item.id)].slice(0, 12) }));
  };
  const go = (s: Screen) => { setScreen(s); setQuery(""); scroller.current?.scrollTo({ y: 0, animated: false }); };
  const openMap = (focus?: string) => { setMapFocus(focus ?? null); go("map"); };
  const submitSearch = () => {
    const q = query.trim();
    if (q) setData(d => ({ ...d, searches: [q, ...d.searches.filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, 5) }));
  };
  const finishQuiz = (id: string, score: number) =>
    setData(d => ({ ...d, quiz: { ...d.quiz, [id]: Math.max(d.quiz[id] ?? 0, score) } }));

  /* ── Perencana perjalanan ── */
  const pd = Math.min(planDay, data.plan.length - 1);
  const isPlanned = (id: string) => data.plan.some(day => day.includes(id));
  const addToPlan = (item: Item) => {
    if (!GEO[item.id]) return;
    setData(d => {
      const di = Math.min(planDay, d.plan.length - 1);
      const plan = d.plan.map(day => day.filter(x => x !== item.id));
      plan[di] = [...plan[di], item.id];
      return { ...d, plan };
    });
    Alert.alert(t(S.addedTo(pd + 1)), t(item.title));
  };
  const removeFromPlan = (id: string) => setData(d => ({ ...d, plan: d.plan.map(day => day.filter(x => x !== id)) }));
  const moveStop = (di: number, i: number, dir: number) => setData(d => {
    const plan = d.plan.map(x => [...x]); const j = i + dir;
    if (j < 0 || j >= plan[di].length) return d;
    [plan[di][i], plan[di][j]] = [plan[di][j], plan[di][i]];
    return { ...d, plan };
  });
  const moveToNextDay = (di: number, id: string) => setData(d => {
    if (d.plan.length < 2) return d;
    const to = (di + 1) % d.plan.length;
    const plan = d.plan.map(x => x.filter(y => y !== id));
    plan[to] = [...plan[to], id];
    return { ...d, plan };
  });
  const addDay = () => { if (data.plan.length >= 7) return; setData(d => ({ ...d, plan: [...d.plan, []] })); setPlanDay(data.plan.length); };
  const clearDay = (di: number) => setData(d => ({ ...d, plan: d.plan.map((x, n) => (n === di ? [] : x)) }));
  const deleteDay = (di: number) => {
    if (data.plan.length < 2) return clearDay(di);
    setData(d => ({ ...d, plan: d.plan.filter((_, n) => n !== di) }));
    setPlanDay(Math.max(0, di - 1));
  };

  const matches = (i: Item) => `${t(i.title)} ${t(i.loc)} ${t(KIND[i.kind])} ${t(i.body)}`.toLowerCase().includes(query.trim().toLowerCase());
  const dq = useDeferredValue(query);
  const hay = useMemo(() => ITEMS.map(i => ({ i, s: `${i.title[lang]} ${i.loc[lang]} ${KIND[i.kind][lang]} ${i.body[lang]}`.toLowerCase() })), [lang]);
  const results = useMemo(() => { const q = dq.trim().toLowerCase(); return q ? hay.filter(h => h.s.includes(q)).map(h => h.i) : []; }, [dq, hay]);
  const isSaved = (id: string) => data.saved.includes(id);
  const rowProps = (i: Item) => ({ item: i, saved: isSaved(i.id), onOpen: () => openItem(i), onSave: () => toggleSave(i.id) });

  if (phase === "splash") return <LangCtx.Provider value={ctx}><SplashScreen /></LangCtx.Provider>;
  if (phase === "lang") return <LanguageScreen initial={lang} onDone={l => { setLang(l); setPhase(user ? "app" : "auth"); }} />;
  if (phase === "auth" || !user) return (
    <LangCtx.Provider value={ctx}><AuthScreen onAuthed={async u => { await loadUser(u); setPhase("app"); }} onGuest={async () => { await AsyncStorage.setItem(K.session, "guest"); await loadUser(GUEST); setPhase("app"); }} /></LangCtx.Provider>
  );

  const isGuest = user.id === "guest";
  const places = ITEMS.filter(i => i.cat === "place");
  const recentItems = data.recent.map(id => byId[id]).filter(Boolean);
  const savedItems = data.saved.map(id => byId[id]).filter(Boolean);
  const visitedItems = data.visited.map(id => byId[id]).filter(Boolean);
  const badges = badgesOf(data);
  const earned = badges.filter(b => b.earned).length;

  const tiles: [Screen, string, L, L][] = [
    ["explore", "map-marker-radius", S.explore, S.tileExplore],
    ["culture", "temple-hindu", S.culture, S.tileCulture],
    ["wear", "tshirt-crew", S.wear, S.tileWear],
    ["umkm", "storefront", S.umkm, S.tileUmkm],
  ];
  const rules: [string, L][] = [
    ["tshirt-crew", L("Cover shoulders and knees; ask if a sash is needed", "Tutupi bahu dan lutut; tanyakan apakah perlu selendang")],
    ["shoe-print", L("Never step on or over offerings", "Jangan menginjak atau melangkahi sesajen")],
    ["camera-off", L("Ask before photographing people who are praying", "Minta izin sebelum memotret orang yang sedang berdoa")],
  ];

  const Home = (
    <View>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontFamily: SERIF, fontSize: 28, color: C.ink, fontWeight: "700" }}>{t(S.hello(user.name.split(" ")[0]))}</Text>
        <Text style={{ fontSize: 15, color: C.muted, marginTop: 4 }}>{t(S.whatToday)}</Text>
        <View style={{ ...SOFT, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, backgroundColor: C.paper, borderRadius: 28, paddingHorizontal: 18 }}>
          <Icon name="magnify" size={22} color={C.muted} />
          <TextInput value={query} onChangeText={setQuery} onSubmitEditing={submitSearch} returnKeyType="search" placeholder={t(S.searchPh)} placeholderTextColor={C.muted} style={{ flex: 1, paddingVertical: 15, fontSize: 16, color: C.ink }} />
        </View>
      </View>

      {query.trim() ? (
        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          {results.length === 0
            ? (dq.trim() === query.trim() ? <Text style={{ color: C.muted }}>{t(S.noResults)}</Text> : null)
            : <Grid>{results.map(i => <ItemRow key={i.id} {...rowProps(i)} />)}</Grid>}
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 22 }}>
            {tiles.map(([key, icon, title, sub]) => {
              const bg = CATC[key]; const fg = onColor(bg);
              return (
                <Pressable key={key} onPress={() => go(key)} accessibilityRole="button" accessibilityLabel={t(title)}
                  style={({ pressed }) => ({ width: "48%", minHeight: 164, marginBottom: 14, padding: 16, borderRadius: 24, backgroundColor: bg, justifyContent: "space-between", transform: [{ scale: pressed ? 0.98 : 1 }] })}>
                  <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(199,182,166,.18)", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={icon} size={30} color={fg} />
                  </View>
                  <View>
                    <Text style={{ fontFamily: SERIF, fontSize: 18, fontWeight: "700", color: fg }}>{t(title)}</Text>
                    <Text style={{ fontSize: 13, color: fg, opacity: 0.9, marginTop: 3, lineHeight: 18 }}>{t(sub)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginHorizontal: 20, marginTop: 4 }}>
            <Pressable onPress={() => openMap()} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 14 }}>
              <Icon name="map-outline" size={24} color={C.burgundy} />
              <Text style={{ flex: 1, fontWeight: "700", color: C.ink }}>{t(S.mapTitle)}</Text>
            </Pressable>
            <Pressable onPress={() => go("plan")} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 14 }}>
              <Icon name="calendar-check-outline" size={24} color={C.burgundy} />
              <Text style={{ flex: 1, fontWeight: "700", color: C.ink }}>{t(S.planTitle)}</Text>
            </Pressable>
          </View>

          <View style={{ marginHorizontal: 20, marginTop: 14, backgroundColor: C.goldSoft, borderRadius: 22, padding: 18 }}>
            <Text style={{ fontFamily: SERIF, fontSize: 18, color: C.ink, fontWeight: "700", marginBottom: 6 }}>{t(S.quickRules)}</Text>
            {rules.map(([icon, text], n) => (
              <View key={n} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
                <Icon name={icon} size={22} color={C.green} />
                <Text style={{ flex: 1, color: C.ink, fontSize: 15, lineHeight: 21 }}>{t(text)}</Text>
              </View>
            ))}
            <Pressable onPress={() => go("wear")} style={{ marginTop: 8, paddingVertical: 8 }}>
              <Text style={{ color: C.burgundy, fontWeight: "700", fontSize: 15 }}>{t(S.seeGuide)} →</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginTop: 28, marginBottom: 12 }}>
            <Text style={{ fontFamily: SERIF, fontSize: 21, color: C.ink, fontWeight: "700" }}>{t(S.topDest)}</Text>
            <Pressable onPress={() => go("explore")} hitSlop={8}><Text style={{ color: C.burgundy, fontWeight: "700", fontSize: 14 }}>{t(S.seeAll)} →</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {places.slice(0, 6).map(p => <OverlayCard key={p.id} width={176} {...rowProps(p)} />)}
          </ScrollView>

          {recentItems.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
              <Text style={{ fontFamily: SERIF, fontSize: 21, color: C.ink, fontWeight: "700", marginBottom: 12 }}>{t(S.recent)}</Text>
              {recentItems.slice(0, 2).map(i => <ItemRow key={i.id} {...rowProps(i)} />)}
            </View>
          )}

          <Pressable onPress={() => go("act")} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 20, marginTop: 14, backgroundColor: C.sage, borderRadius: 18, padding: 16 }}>
            <Icon name="leaf" size={24} color={C.green} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: C.green, fontSize: 15 }}>{t(S.greenBanner)}</Text>
              <Text style={{ color: C.green2, fontSize: 13, marginTop: 2 }}>{t(S.actSub)}</Text>
            </View>
            <Icon name="chevron-right" size={22} color={C.green2} />
          </Pressable>

          <Pressable onPress={() => setSheet("suggest")} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 20, marginTop: 12, backgroundColor: C.paper, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.line }}>
            <Icon name="message-text-outline" size={24} color={C.lawar} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: C.ink, fontSize: 15 }}>{t(S.suggest)}</Text>
              <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{t(S.suggestSub)}</Text>
            </View>
            <Icon name="chevron-right" size={22} color={C.muted} />
          </Pressable>
          <Text style={{ fontSize: 12, color: C.muted, lineHeight: 17, marginHorizontal: 20, marginTop: 18 }}>{t(S.disclaimer)}</Text>
        </>
      )}
    </View>
  );

  const placeFilters: [string, L][] = [["all", S.all], ["nature", KIND.nature], ["culture", KIND.culture], ["temple", KIND.temple]];
  const Explore = (
    <View>
      <Header title={t(S.explore)} sub={t(S.exploreSub)} onBack={() => go("home")} color={CATC.explore} icon="map-marker-radius" />
      <View style={{ paddingHorizontal: 20 }}>
        <TextInput value={query} onChangeText={setQuery} placeholder={t(S.searchPh)} placeholderTextColor={C.muted} style={{ backgroundColor: C.paper, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.line, color: C.ink }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 14 }}>
          {placeFilters.map(([k, l]) => <Pill key={k} label={t(l)} on={placeFilter === k} onPress={() => setPlaceFilter(k)} color={CATC.explore} />)}
        </ScrollView>
        <Grid>{places.filter(p => (placeFilter === "all" || p.kind === placeFilter) && (!query.trim() || matches(p))).map(p => <OverlayCard key={p.id} {...rowProps(p)} />)}</Grid>
        <QuizCard id="places" color={C.green} best={data.quiz.places} onStart={() => setQuizId("places")} />
      </View>
    </View>
  );

  const cultureTabs: [string, L][] = [["tradition", KIND.tradition], ["etiquette", KIND.etiquette], ["history", KIND.history]];
  const Culture = (
    <View>
      <Header title={t(S.culture)} sub={t(S.cultureSub)} onBack={() => go("home")} color={CATC.culture} icon="temple-hindu" />
      <View style={{ paddingHorizontal: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {cultureTabs.map(([k, l]) => <Pill key={k} label={t(l)} on={cultureTab === k} onPress={() => setCultureTab(k)} color={CATC.culture} />)}
        </ScrollView>
        <Grid>{ITEMS.filter(i => i.cat === "culture" && i.kind === cultureTab).map(i => <StoryCard key={i.id} {...rowProps(i)} />)}</Grid>
        <QuizCard id="culture" color={C.brown} best={data.quiz.culture} onStart={() => setQuizId("culture")} />
      </View>
    </View>
  );

  const wear = WEAR[wearTab];
  const Wear = (
    <View>
      <Header title={t(S.wear)} sub={t(S.wearSub)} onBack={() => go("home")} color={CATC.wear} icon="tshirt-crew" />
      <View style={{ paddingHorizontal: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {WEAR_TABS.map(([k, l]) => <Pill key={k} label={t(l)} on={wearTab === k} onPress={() => setWearTab(k)} color={CATC.wear} />)}
        </ScrollView>
        <Image source={wear.image} resizeMode="cover" style={{ height: 220, width: "100%", borderRadius: 20, backgroundColor: C.sage }} />
        <Text style={{ fontFamily: SERIF, fontSize: 20, color: C.ink, fontWeight: "700", marginTop: 18, marginBottom: 6 }}>{t(wear.heading)}</Text>
        {wear.items.map((it, n) => (
          <View key={n} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10, borderBottomWidth: n < wear.items.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
            <Icon name="check-circle" size={22} color={C.bunga} />
            <Text style={{ flex: 1, color: C.ink, fontSize: 15, lineHeight: 21 }}>{t(it)}</Text>
          </View>
        ))}
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 10 }}>{t(S.wearVary)}</Text>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: C.goldSoft, borderRadius: 16, padding: 16, marginTop: 18 }}>
          <Icon name="alert-circle" size={28} color={C.burgundy} />
          <Text style={{ flex: 1, color: C.ink, lineHeight: 20 }}>{t(S.wearNote)}</Text>
        </View>
        <View style={{ marginTop: 14 }}>
          <PrimaryButton outline tone="red" label={t(S.watch)} icon="play-circle-outline" onPress={() => Linking.openURL(ytSearch(WEAR_VIDEO_Q)).catch(() => {})} />
        </View>
        <QuizCard id="wear" color={C.burgundy} best={data.quiz.wear} onStart={() => setQuizId("wear")} />
      </View>
    </View>
  );

  const umkmFilters: [string, L][] = [["all", S.all], ["handicraft", KIND.handicraft], ["food", S.foodRec], ["fashion", KIND.fashion]];
  const Umkm = (
    <View>
      <Header title={t(S.umkm)} sub={t(S.umkmSub)} onBack={() => go("home")} color={CATC.umkm} icon="storefront" />
      <View style={{ paddingHorizontal: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {umkmFilters.map(([k, l]) => <Pill key={k} label={t(l)} on={umkmFilter === k} onPress={() => setUmkmFilter(k)} color={CATC.umkm} />)}
        </ScrollView>
        <Grid>{ITEMS.filter(i => i.cat === "umkm" && (umkmFilter === "all" || i.kind === umkmFilter)).map(i => <OverlayCard key={i.id} {...rowProps(i)} />)}</Grid>
        <Text style={{ fontSize: 12, color: C.muted, lineHeight: 17, marginTop: 4 }}>{t(S.checkLocal)}</Text>
      </View>
    </View>
  );

  const Act = (
    <View>
      <Header title={t(S.act)} sub={t(S.actSub)} onBack={() => go("home")} color={CATC.act} icon="leaf" />
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ backgroundColor: C.sage, borderRadius: 22, padding: 20, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: SERIF, fontSize: 20, color: C.green, fontWeight: "700" }}>{t(S.actHero)}</Text>
            <Text style={{ color: C.green2, marginTop: 6, lineHeight: 20 }}>{t(S.actHeroSub)}</Text>
          </View>
          <Icon name="earth" size={64} color={C.green2} />
        </View>
        <Text style={{ fontFamily: SERIF, fontSize: 20, color: C.ink, fontWeight: "700", marginTop: 24, marginBottom: 12 }}>{t(S.activities)}</Text>
        <View style={{ backgroundColor: C.paper, borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: "hidden" }}>
          <Pressable onPress={() => setQuizId("green")} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.sage, alignItems: "center", justifyContent: "center" }}><Icon name="school" size={22} color={C.green} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: C.ink }}>{t(S.greenQuiz)}</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                {t(S.questions(QUIZZES.green.qs.length))}{data.quiz.green !== undefined ? `  ·  ${t(S.best(data.quiz.green, QUIZZES.green.qs.length))}` : ""}
              </Text>
            </View>
            <Icon name="chevron-right" size={22} color={C.muted} />
          </Pressable>
          <Pressable onPress={() => { setData(d => ({ ...d, joinedCleanup: true })); Alert.alert(t(S.joined), t(S.cleanupMsg)); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.sage, alignItems: "center", justifyContent: "center" }}><Icon name="hand-heart" size={22} color={C.green} /></View>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: "700", color: C.ink }}>{t(S.cleanup)}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{t(data.joinedCleanup ? S.joined : S.cleanupSub)}</Text></View>
            <Icon name={data.joinedCleanup ? "check-circle" : "chevron-right"} size={22} color={data.joinedCleanup ? C.green2 : C.muted} />
          </Pressable>
        </View>
        <View style={{ marginTop: 18 }}><PrimaryButton label={`${t(S.moreAct)}  →`} onPress={() => setSheet("more")} /></View>
      </View>
    </View>
  );

  /* ── Rencana perjalanan ── */
  const dayItems = (data.plan[pd] ?? []).map(id => byId[id]).filter(Boolean);
  const totalMin = dayItems.reduce((s, i) => s + (DUR[i.kind] ?? 45), 0);
  const refGeo = dayItems.length ? GEO[dayItems[dayItems.length - 1].id] : CENTER;
  const ideas = MAPPED.filter(i => !isPlanned(i.id)).sort((a, b) => kmBetween(refGeo, GEO[a.id]) - kmBetween(refGeo, GEO[b.id])).slice(0, 4);
  const Plan = (
    <View>
      <Header title={t(S.planTitle)} sub={t(S.planSub)} color={C.burgundy} icon="calendar-check" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        {data.plan.map((_, n) => <Pill key={n} label={t(S.day(n + 1))} on={pd === n} onPress={() => setPlanDay(n)} color={C.green} />)}
        {data.plan.length < 7 && (
          <Pressable onPress={addDay} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5, borderColor: C.green, borderStyle: "dashed" }}>
            <Icon name="plus" size={16} color={C.green} /><Text style={{ fontWeight: "700", color: C.green }}>{t(S.addDay)}</Text>
          </Pressable>
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: 20 }}>
        {dayItems.length === 0
          ? <Text style={{ color: C.muted, lineHeight: 22 }}>{t(S.planEmpty)}</Text>
          : (
            <>
              <Text style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>{t(S.planTotal(fmtDur(totalMin)))}</Text>
              {dayItems.map((i, n) => (
                <View key={i.id} style={{ marginBottom: 10 }}>
                  {n > 0 && (
                    <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6, marginLeft: 14 }}>
                      ↓ {t(S.planFrom(kmBetween(GEO[dayItems[n - 1].id], GEO[i.id]).toFixed(1)))}
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.paper, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12 }}>
                    <Pressable onPress={() => openItem(i)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.burgundy, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: C.white, fontWeight: "800" }}>{n + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: SERIF, fontSize: 16, color: C.ink, fontWeight: "700" }} numberOfLines={2}>{t(i.title)}</Text>
                        <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{t(i.loc)}  ·  {fmtDur(DUR[i.kind] ?? 45)}</Text>
                      </View>
                    </Pressable>
                    <View style={{ alignItems: "center" }}>
                      <Pressable onPress={() => moveStop(pd, n, -1)} hitSlop={6}><Icon name="chevron-up" size={22} color={n === 0 ? C.line : C.ink} /></Pressable>
                      <Pressable onPress={() => moveStop(pd, n, 1)} hitSlop={6}><Icon name="chevron-down" size={22} color={n === dayItems.length - 1 ? C.line : C.ink} /></Pressable>
                    </View>
                    <View style={{ alignItems: "center", gap: 8 }}>
                      {data.plan.length > 1 && (
                        <Pressable onPress={() => moveToNextDay(pd, i.id)} hitSlop={6} accessibilityLabel={t(S.moveDay)}><Icon name="calendar-arrow-right" size={20} color={C.green2} /></Pressable>
                      )}
                      <Pressable onPress={() => removeFromPlan(i.id)} hitSlop={6}><Icon name="close" size={20} color={C.burgundy} /></Pressable>
                    </View>
                  </View>
                </View>
              ))}
              <View style={{ marginTop: 10, gap: 10 }}>
                <PrimaryButton label={t(S.openRoute)} icon="directions" onPress={() => openRoute(dayItems)} />
                <PrimaryButton outline label={t(S.showOnMap)} icon="map-outline" onPress={() => { setMapFilter("plan"); openMap(); }} />
                <PrimaryButton outline tone="red" label={t(S.clearDay)} icon="broom" onPress={() => clearDay(pd)} />
                {data.plan.length > 1 && <PrimaryButton outline tone="red" label={t(S.deleteDay)} icon="calendar-remove-outline" onPress={() => deleteDay(pd)} />}
              </View>
            </>
          )}

        <Text style={{ fontFamily: SERIF, fontSize: 20, color: C.ink, fontWeight: "700", marginTop: 26, marginBottom: 12 }}>{t(S.planIdeas)}</Text>
        {ideas.length === 0 ? <Text style={{ color: C.muted }}>{t(S.planIdeasEmpty)}</Text> : ideas.map(i => (
          <View key={i.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.paper, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 10, marginBottom: 10 }}>
            <Pressable onPress={() => openItem(i)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Image source={sized(i.image, 240)} style={{ width: 54, height: 54, borderRadius: 12, backgroundColor: C.sage }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: SERIF, fontSize: 15, color: C.ink, fontWeight: "700" }} numberOfLines={2}>{t(i.title)}</Text>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>~{kmBetween(refGeo, GEO[i.id]).toFixed(1)} km  ·  {t(KIND[i.kind])}</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => addToPlan(i)} hitSlop={8} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.green, alignItems: "center", justifyContent: "center" }}>
              <Icon name="plus" size={22} color={C.white} />
            </Pressable>
          </View>
        ))}
        <Text style={{ fontSize: 12, color: C.muted, lineHeight: 17, marginTop: 10 }}>{t(S.planNote)}</Text>
      </View>
    </View>
  );

  const Saved = (
    <View>
      <Header title={t(S.tabSaved)} sub={t(S.savedSub)} />
      <View style={{ paddingHorizontal: 20 }}>
        {savedItems.length === 0
          ? <Text style={{ color: C.muted, lineHeight: 22 }}>{t(S.savedEmpty)}</Text>
          : <Grid>{savedItems.map(i => <ItemRow key={i.id} {...rowProps(i)} />)}</Grid>}
      </View>
    </View>
  );

  const menu: [string, L, string | undefined, () => void][] = [
    ["account-edit-outline", S.editProfile, undefined, () => setSheet("editProfile")],
    ...(isGuest ? [] : [["lock-outline", S.changePassword, undefined, () => setSheet("password")] as [string, L, string | undefined, () => void]]),
    ["calendar-check-outline", S.myTrips, undefined, () => setSheet("trips")],
    ["message-text-outline", S.suggest, undefined, () => setSheet("suggest")],
    ["cog-outline", S.settings, undefined, () => setSheet("settings")],
    ["web", S.language, lang === "en" ? "English" : "Bahasa Indonesia", () => setLang(lang === "en" ? "id" : "en")],
    ["help-circle-outline", S.help, undefined, () => setSheet("help")],
    ["information-outline", S.about, undefined, () => setSheet("about")],
  ];
  const Profile = (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Pressable onPress={() => setSheet("editProfile")} accessibilityRole="button" accessibilityLabel={t(S.editProfile)}>
          <Avatar uri={avatar} name={user.name} size={96} />
          <View style={{ position: "absolute", right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16, backgroundColor: C.green, borderWidth: 2, borderColor: C.cream, alignItems: "center", justifyContent: "center" }}>
            <Icon name="camera" size={16} color={C.white} />
          </View>
        </Pressable>
        <Text style={{ fontFamily: SERIF, fontSize: 22, color: C.ink, fontWeight: "700", marginTop: 12 }}>{user.name}</Text>
        <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{t(isGuest ? S.guestLabel : S.member)}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {([[data.saved.length, S.saved, "saved"], [data.visited.length, S.visited, "trips"], [earned, S.badges, "badges"]] as [number, L, SheetKey][]).map(([n, l, key], idx) => (
          <Pressable key={idx} onPress={() => setSheet(key === "saved" ? null : key)} style={{ flex: 1, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingVertical: 14, alignItems: "center" }}>
            <Text style={{ fontFamily: SERIF, fontSize: 24, color: C.ink, fontWeight: "700" }}>{n}</Text>
            <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{t(l)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ backgroundColor: C.paper, borderRadius: 18, borderWidth: 1, borderColor: C.line, marginTop: 20, overflow: "hidden" }}>
        {menu.map(([icon, label, value, onPress], n) => (
          <Pressable key={n} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: n < menu.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
            <Icon name={icon} size={22} color={C.green} />
            <Text style={{ flex: 1, color: C.ink, fontSize: 15 }}>{t(label)}</Text>
            {value ? <Text style={{ color: C.muted, fontSize: 13 }}>{value}</Text> : null}
            <Icon name="chevron-right" size={20} color={C.muted} />
          </Pressable>
        ))}
      </View>
      <View style={{ marginTop: 20 }}>
        {isGuest
          ? <PrimaryButton label={t(S.authOrCreate)} icon="account-plus-outline" onPress={logout} />
          : <PrimaryButton label={t(S.logout)} tone="red" outline icon="logout"
              onPress={() => Alert.alert(t(S.logout), t(S.logoutMsg), [{ text: t(S.cancel), style: "cancel" }, { text: t(S.logout), style: "destructive", onPress: logout }])} />}
      </View>
    </View>
  );

  const MapEl = (
    <MapScreen filter={mapFilter} setFilter={setMapFilter} plan={data.plan} planDay={pd} setPlanDay={setPlanDay} focus={mapFocus}
      onOpen={openItem} onAdd={addToPlan} isPlanned={isPlanned} rowProps={rowProps} />
  );

  const body = { home: Home, explore: Explore, culture: Culture, wear: Wear, umkm: Umkm, act: Act, plan: Plan, saved: Saved, profile: Profile, map: null }[screen];
  const tabs: [Screen, L, string][] = [["home", S.tabHome, "home-variant"], ["map", S.tabMap, "map"], ["plan", S.tabPlan, "calendar-check"], ["saved", S.tabSaved, "bookmark"], ["profile", S.tabProfile, "account"]];
  const tabActive: Screen = ["explore", "culture", "wear", "umkm", "act"].includes(screen) ? "home" : screen;

  return (
    <LangCtx.Provider value={ctx}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.cream, paddingTop: TOP }}>
        <StatusBar barStyle="dark-content" backgroundColor={C.cream} />
        <Icon name="flower" size={200} color={C.sage} style={{ position: "absolute", top: -50, right: -60, opacity: 0.45 }} />
        <View style={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: 20, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Logo size={26} /><Text style={{ fontFamily: SERIF, fontSize: 21, color: C.green, fontWeight: "700", flex: 1 }}>RouteUbud</Text>
          <View style={{ flexDirection: "row", gap: 5, marginRight: 6 }}>
            {[C.padi, C.kunyit, C.bunga, C.lawar].map(c => <View key={c} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />)}
          </View>
          <Pressable onPress={() => go("profile")} hitSlop={6} accessibilityRole="button" accessibilityLabel={t(S.tabProfile)}><Avatar uri={avatar} name={user.name} size={34} /></Pressable>
          <Pressable onPress={() => setLang(lang === "en" ? "id" : "en")} hitSlop={8} accessibilityLabel="Language"
            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }}>
            <Icon name="translate" size={16} color={C.green} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: C.green }}>{lang === "en" ? "EN" : "ID"}</Text>
          </Pressable>
        </View>

        {screen === "map" ? (
          <View style={{ flex: 1, width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }}>{MapEl}</View>
        ) : (
          <ScrollView ref={scroller} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 30, paddingTop: 6, alignItems: "center" }}>
            <View style={{ width: "100%", maxWidth: contentMaxWidth }}>
              {body}
            </View>
          </ScrollView>
        )}

        <View style={{ width: "100%", alignItems: "center", backgroundColor: C.paper, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, paddingBottom: Platform.OS === "ios" ? 6 : 10 }}>
          <View style={{ width: "100%", maxWidth: contentMaxWidth, flexDirection: "row" }}>
          {tabs.map(([name, label, icon]) => {
            const on = tabActive === name;
            return (
              <Pressable key={name} onPress={() => (name === "map" ? openMap() : go(name))} accessibilityRole="tab" accessibilityLabel={t(label)} accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: "center" }}>
                <Icon name={on ? icon : `${icon}-outline`} size={24} color={on ? C.burgundy : C.muted} />
                <Text style={{ fontSize: 12, marginTop: 2, color: on ? C.ink : C.muted, fontWeight: on ? "800" : "500" }}>{t(label)}</Text>
              </Pressable>
            );
          })}
          </View>
        </View>

        {/* Detail sheet */}
        {active && (
          <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActive(null)}>
            <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
              <ScrollView>
                <View>
                  <Image source={active.image} resizeMode="cover" style={{ height: 270, width: "100%", backgroundColor: C.sage }} />
                  <Pressable onPress={() => setActive(null)} style={{ position: "absolute", top: 16, right: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: C.paper, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="close" size={20} color={C.ink} />
                  </Pressable>
                </View>
                <View style={{ padding: 22 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: CATB[active.cat], alignItems: "center", justifyContent: "center" }}>
                      <Icon name={CATI[active.cat]} size={16} color={onColor(CATB[active.cat])} />
                    </View>
                    <Text style={{ color: INK[active.cat], fontWeight: "700", fontSize: 13 }}>{t(KIND[active.kind])}</Text>
                  </View>
                  <Text style={{ fontFamily: SERIF, fontSize: 28, color: C.ink, fontWeight: "700", marginTop: 6 }}>{t(active.title)}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                    <Text style={{ fontSize: 13, color: C.muted }}>{t(active.loc)}</Text>
                    {active.rating ? <><Icon name="star" size={14} color={C.star} /><Text style={{ fontSize: 13, color: C.muted }}>{active.rating}</Text></> : null}
                    {active.mins ? <Text style={{ fontSize: 13, color: C.muted }}>· {t(S.min(active.mins))}</Text> : null}
                  </View>
                  {PHOTO_CREDITS[active.id] && (
                    <Pressable onPress={() => Linking.openURL(PHOTO_CREDITS[active.id].url).catch(() => {})} style={{ marginTop: 8 }}>
                      <Text style={{ color: C.muted, fontSize: 11, textDecorationLine: "underline" }}>Photo source: {PHOTO_CREDITS[active.id].label}</Text>
                    </Pressable>
                  )}
                  <Text style={{ fontFamily: SERIF, fontSize: 16, color: C.brown, lineHeight: 27, marginTop: 18 }}>{t(active.body)}</Text>
                  {active.tips && (
                    <View style={{ marginTop: 20, backgroundColor: C.paper, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.line }}>
                      <Text style={{ fontWeight: "700", color: C.ink, marginBottom: 6 }}>{t(S.goodToKnow)}</Text>
                      {active.tips.map((tip, n) => (
                        <View key={n} style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                          <Icon name="check-circle-outline" size={18} color={INK[active.cat]} />
                          <Text style={{ flex: 1, color: C.brown, lineHeight: 20 }}>{t(tip)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {GEO[active.id]?.approx && <Text style={{ fontSize: 12, color: C.muted, lineHeight: 17, marginTop: 14 }}>{t(S.approx)}</Text>}
                  <View style={{ marginTop: 22, gap: 12 }}>
                    <PrimaryButton label={t(isSaved(active.id) ? S.saved : S.save)} icon={isSaved(active.id) ? "bookmark" : "bookmark-outline"} onPress={() => toggleSave(active.id)} />
                    {GEO[active.id] && (
                      <PrimaryButton outline label={t(isPlanned(active.id) ? S.inPlan : S.addPlan)} icon={isPlanned(active.id) ? "calendar-check" : "calendar-plus"} onPress={() => addToPlan(active)} />
                    )}
                    {active.cat === "place" && (
                      <PrimaryButton outline label={t(data.visited.includes(active.id) ? S.visited : S.markVisited)} icon={data.visited.includes(active.id) ? "map-marker-check" : "map-marker-plus-outline"} onPress={() => toggleVisited(active.id)} />
                    )}
                    {GEO[active.id] && (
                      <PrimaryButton outline label={t(S.showOnMap)} icon="map-marker-radius-outline" onPress={() => { const id = active.id; setActive(null); setMapFilter("all"); openMap(id); }} />
                    )}
                    <PrimaryButton outline tone="red" label={t(S.watch)} icon="play-circle-outline" onPress={() => Linking.openURL(videoUrl(active)).catch(() => {})} />
                    {active.mapQuery && (
                      <PrimaryButton outline label={t(S.openMaps)} icon="map-outline" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(active.mapQuery!)}`).catch(() => {})} />
                    )}
                  </View>
                  {active.cat === "umkm" && <Text style={{ fontSize: 12, color: C.muted, lineHeight: 17, marginTop: 16 }}>{t(S.checkLocal)}</Text>}
                </View>
              </ScrollView>
            </SafeAreaView>
          </Modal>
        )}

        {/* Profile sheets */}
        {sheet === "trips" && (
          <Sheet title={t(S.myTrips)} onClose={() => setSheet(null)}>
            {visitedItems.length === 0
              ? <Text style={{ color: C.muted, lineHeight: 22 }}>{t(S.tripsEmpty)}</Text>
              : visitedItems.map(i => <ItemRow key={i.id} {...rowProps(i)} />)}
          </Sheet>
        )}
        {sheet === "badges" && (
          <Sheet title={t(S.badges)} onClose={() => setSheet(null)}>
            {badges.map(b => (
              <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 16, backgroundColor: b.earned ? C.sage : C.paper, borderWidth: 1, borderColor: C.line, marginBottom: 10, opacity: b.earned ? 1 : 0.7 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: b.earned ? C.green : C.line, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={b.icon} size={24} color={b.earned ? C.white : C.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: C.ink }}>{t(b.title)}</Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{t(b.desc)}</Text>
                </View>
                {b.earned && <Icon name="check-circle" size={22} color={C.green2} />}
              </View>
            ))}
          </Sheet>
        )}
        {sheet === "settings" && (
          <Sheet title={t(S.settings)} onClose={() => setSheet(null)}>
            <Text style={{ color: C.muted, marginBottom: 16 }}>{isGuest ? t(S.guestNote) : user.email}</Text>
            <PrimaryButton outline icon="history" label={t(S.clearHistory)} onPress={() => setData(d => ({ ...d, recent: [], searches: [] }))} />
            {!isGuest && <View style={{ marginTop: 12 }}><PrimaryButton outline tone="red" icon="account-remove-outline" label={t(S.deleteAccount)} onPress={deleteAccount} /></View>}
          </Sheet>
        )}
        {sheet === "help" && <Sheet title={t(S.help)} onClose={() => setSheet(null)}><Text style={{ color: C.ink, lineHeight: 24, fontSize: 15 }}>{t(S.helpText)}</Text></Sheet>}
        {sheet === "about" && (
          <Sheet title={t(S.about)} onClose={() => setSheet(null)}>
            <View style={{ alignItems: "center", marginBottom: 16 }}><Logo size={64} /></View>
            <Text style={{ color: C.ink, lineHeight: 24, fontSize: 15 }}>{t(S.aboutText)}</Text>
            <Text style={{ fontFamily: SERIF, fontStyle: "italic", color: C.muted, marginTop: 16 }}>{t(S.motto)}</Text>
          </Sheet>
        )}
        {sheet === "suggest" && <SuggestionSheet name={user.name} onClose={() => setSheet(null)} />}
        {sheet === "editProfile" && <EditProfileSheet user={user} avatar={avatar} isGuest={isGuest} onPhoto={setPhoto} onName={saveName} onClose={() => setSheet(null)} />}
        {sheet === "password" && !isGuest && <PasswordSheet onSubmit={changePw} onClose={() => setSheet(null)} />}
        {sheet === "more" && (
          <Sheet title={t(S.moreAct)} onClose={() => setSheet(null)}>
            {[
              L("Carry a reusable bottle and say no to single-use plastic.", "Bawa botol minum isi ulang dan tolak plastik sekali pakai."),
              L("Stay on paths in rice fields and respect farmers' work.", "Tetap di jalur saat di sawah dan hormati pekerjaan petani."),
              L("Buy directly from local makers and ask about materials.", "Beli langsung dari pengrajin lokal dan tanyakan bahannya."),
              L("Take your litter with you and sort waste where bins allow.", "Bawa sampah Anda dan pilah sampah jika tersedia tempatnya."),
            ].map((tip, n) => (
              <View key={n} style={{ flexDirection: "row", gap: 12, padding: 14, backgroundColor: C.paper, borderRadius: 14, borderWidth: 1, borderColor: C.line, marginBottom: 10 }}>
                <Icon name="leaf" size={20} color={C.green2} /><Text style={{ flex: 1, color: C.ink, lineHeight: 21 }}>{tip[lang]}</Text>
              </View>
            ))}
          </Sheet>
        )}

        {quizId && <QuizSheet key={quizId} quizId={quizId} onClose={() => setQuizId(null)} onDone={finishQuiz} />}
      </SafeAreaView>
    </LangCtx.Provider>
  );
}
