export default function exception(
  message: string,
  code = "E_MISSING_DATABASE_ROW",
  status = 404
) {
  return {
    message: message,
    status: status,
    code: code
  }
};
