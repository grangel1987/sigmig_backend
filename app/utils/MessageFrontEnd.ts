export default function messageFrontEnd(
  message: string,
  title = "Exito",
  interceptor = true,
  plugin = "notification"
) {
  return {
    title,
    message,
    interceptor,
    plugin,
  };
};
