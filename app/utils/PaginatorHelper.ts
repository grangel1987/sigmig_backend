export default function (page?: number | string | null, perPage?: number | string | null) {

  return { page: Number(page) || 1, perPage: Number(perPage) || 10 };
};
