export default async function handler(request, response) {
  try {
    const movieId = request.query.id;

    let url;

    if (movieId) {
      url = `https://api.themoviedb.org/3/movie/${movieId}?language=en-US`;
    } else {
      url = "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1";
    }

    const tmdbResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_TOKEN}`,
        accept: "application/json"
      }
    });

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
