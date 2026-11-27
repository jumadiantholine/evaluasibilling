#!/usr/bin/env bash
# Ganti provider Prisma dari SQLite (sandbox) ke PostgreSQL (Supabase) — untuk deploy ke Vercel.
# Jalankan SEKALI sebelum push ke GitHub jika target deploy adalah Supabase:
#   bash scripts/switch-supabase.sh
set -e
SCHEMA="prisma/schema.prisma"
if [ ! -f "$SCHEMA" ]; then echo "File $SCHEMA tidak ditemukan"; exit 1; fi
sed -i 's|provider = "sqlite" // GANTI KE "postgresql" SAAT DEPLOY KE SUPABASE|provider = "postgresql"|' "$SCHEMA"
sed -i 's|provider = "sqlite"|provider = "postgresql"|' "$SCHEMA"
if grep -q 'provider = "postgresql"' "$SCHEMA"; then
  echo "OK: prisma/schema.prisma sekarang menggunakan provider postgresql."
  echo "Pastikan DATABASE_URL di .env / Vercel sudah menunjuk ke connection string Supabase."
else
  echo "GAGAL: provider belum berubah — ubah manual baris datasource db { provider = ... }"
  exit 1
fi
