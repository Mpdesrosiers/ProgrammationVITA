export async function getMondayBoards() {
  const response = await fetch("/api/monday");

  if (!response.ok) {
    throw new Error("Impossible de communiquer avec Monday");
  }

  return response.json();
}
