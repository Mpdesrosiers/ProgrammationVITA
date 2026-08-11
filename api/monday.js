export default async function handler(req, res) {
  try {
    const query = `
      query {
        me {
          name
          email
        }
      }
    `;

    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.MONDAY_API_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      return res.status(500).json({
        error: "Erreur Monday",
        details: data.errors || data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur",
      details: error.message,
    });
  }
}
