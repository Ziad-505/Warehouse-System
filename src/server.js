import "dotenv/config";
import app from "./app.js";


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend Server is running on: http://localhost:${PORT}`);
});
