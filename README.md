# Pop Balil 2 ???

Versi game ini telah dimigrasi dari Firebase ke backend Node.js.

## Fitur
- **Backend Express**: Menyajikan file game dan menangani logika API.

- **Socket.io**: Menggantikan Firebase Realtime Database untuk pembaruan skor dan papan peringkat secara real-time.

- **Persistensi Lokal**: Menyimpan skor dalam file `database.json`.

## Cara Menjalankan

1. Pastikan Anda telah menginstal [Node.js](https://nodejs.org/).

2. Buka terminal Anda di folder ini.

3. Instal dependensi:

```bash

npm install
```
4. Mulai server:

```bash

npm start
```
5. Buka browser Anda dan kunjungi:

[http://localhost:3000](http://localhost:3000)

## File
- `server.js`: Server Node.js.

- `database.json`: Tempat penyimpanan data pemain (dibuat secara otomatis).

- `index.html`, `style.css`, `script.js`: File frontend yang diperbarui.