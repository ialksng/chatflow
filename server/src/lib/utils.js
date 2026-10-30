import jwt from "jsonwebtoken"; 

export const generateToken = (userId, res) => {
    const token = jwt.sign(
        { userId },
        process.env.JWT_SECRET || "chatflow-default-secret-key",
        { expiresIn: "7d" }
    );

    if (res) {
        res.cookie("jwt", token, {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
            httpOnly: true, 
            sameSite: "lax", 
            secure: true,
            path: "/"
        });
    }

    return token;
};
