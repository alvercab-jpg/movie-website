import { neon } from "@neondatabase/serverless";

export default async function handler(request, response) {
  try {
    const sql = neon(process.env.DATABASE_URL);

    // =========================
    // GET REVIEW
    // =========================

    if (request.method === "GET") {
      const movieId = request.query.id;

      if (!movieId) {
        return response.status(400).json({
          error: "Movie ID is required"
        });
      }

      const result = await sql`
        SELECT movie_id, rating, review
        FROM movie_reviews
        WHERE movie_id = ${movieId}
        LIMIT 1
      `;

      if (result.length === 0) {
        return response.status(404).json({
          error: "Review not found"
        });
      }

      return response.status(200).json(result[0]);
    }

    // =========================
    // SAVE REVIEW (admin only)
    // =========================

    if (request.method === "POST") {
      const cookies = request.headers.cookie || "";

      const isAuthenticated = cookies
        .split(";")
        .map(cookie => cookie.trim())
        .includes("admin_authenticated=true");

      if (!isAuthenticated) {
        return response.status(401).json({
          error: "Unauthorized"
        });
      }

      const { movie_id, rating, review } = request.body;

      if (!movie_id || rating === undefined) {
        return response.status(400).json({
          error: "movie_id and rating are required"
        });
      }

      const result = await sql`
        INSERT INTO movie_reviews (
          movie_id,
          rating,
          review
        )
        VALUES (
          ${movie_id},
          ${rating},
          ${review || ""}
        )
        ON CONFLICT (movie_id)
        DO UPDATE SET
          rating = EXCLUDED.rating,
          review = EXCLUDED.review
        RETURNING movie_id, rating, review
      `;

      return response.status(200).json(result[0]);
    }

    return response.status(405).json({
      error: "Method not allowed"
    });

  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: "Something went wrong"
    });
  }
}
