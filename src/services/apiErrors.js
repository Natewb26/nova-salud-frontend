export const getErrorMessage = (error) => {
  if (!error?.response) {
    return 'No se pudo conectar con el servidor'
  }

  if (error.response.status === 429) {
    return 'Demasiados intentos. Espera unos minutos'
  }

  return (
    error.response.data?.error?.message ??
    'Ocurrió un error inesperado'
  )
}

export const getFieldErrors = (error) => {
  const details = error?.response?.data?.error?.details

  if (!Array.isArray(details)) return {}

  return details.reduce((fieldErrors, detail) => {
    if (detail?.campo && detail?.mensaje) {
      fieldErrors[detail.campo] = detail.mensaje
    }

    return fieldErrors
  }, {})
}
