'use client'

import Swal from 'sweetalert2'

// ===================================================================
// SweetAlert2 helpers — notifikasi & konfirmasi
// ===================================================================

const baseConfig = {
  allowOutsideClick: false,
  allowEscapeKey: true,
  customClass: {
    popup: 'rounded-2xl shadow-xl',
    confirmButton:
      'bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium ml-2 hover:opacity-90',
    cancelButton:
      'bg-muted text-foreground px-4 py-2 rounded-lg font-medium mr-2 hover:opacity-80',
  },
  buttonsStyling: false,
}

export const swal = {
  loading(title = 'Memproses...') {
    Swal.fire({
      ...baseConfig,
      title,
      allowOutsideClick: true,
      didOpen: () => Swal.showLoading(),
      showConfirmButton: false,
    })
  },

  success(title: string, text?: string) {
    return Swal.fire({
      ...baseConfig,
      icon: 'success',
      title,
      text,
      timer: 2500,
      showConfirmButton: false,
    })
  },

  error(title: string, text?: string) {
    return Swal.fire({
      ...baseConfig,
      icon: 'error',
      title,
      text,
    })
  },

  warning(title: string, text?: string) {
    return Swal.fire({
      ...baseConfig,
      icon: 'warning',
      title,
      text,
    })
  },

  info(title: string, text?: string) {
    return Swal.fire({
      ...baseConfig,
      icon: 'info',
      title,
      text,
    })
  },

  confirm(
    title: string,
    text: string,
    confirmText = 'Ya, lanjutkan',
    cancelText = 'Batal'
  ): Promise<boolean> {
    return Swal.fire({
      ...baseConfig,
      icon: 'warning',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
    }).then((r) => r.isConfirmed)
  },

  close() {
    Swal.close()
  },

  /** Input prompt */
  async prompt(title: string, placeholder?: string): Promise<string | null> {
    const r = await Swal.fire({
      ...baseConfig,
      title,
      input: 'text',
      inputPlaceholder: placeholder,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
    })
    return r.isConfirmed ? String(r.value ?? '') : null
  },
}
