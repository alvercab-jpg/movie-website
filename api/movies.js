export default async function handler(request, response) {
  try {
    const tmdbResponse = await fetch(
      "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1",
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_TOKEN}`,
          accept: "application/json"
        }
      }
    );

    if (!tmdbResponse.ok) {
      return response.status(tmdbResponse.status).json({
        error: "TMDB request failed"
      });
    }

    const data = await tmdbResponse.json();

    return response.status(200).json(data);
  } catch (error) {
    return response.status(500).json({
      error: "Something went wrong"
    });
  }
}
