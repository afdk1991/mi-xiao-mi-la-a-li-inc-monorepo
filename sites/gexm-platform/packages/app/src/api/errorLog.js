import http from './request'

export const errorLogApi = {
  report(data) {
    return http.post('/error-logs/report', data, { showError: false, loading: false })
  },
}

export default errorLogApi
