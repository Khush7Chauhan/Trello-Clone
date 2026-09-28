import express from "express";
import type {NextFunction, Request, Response } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors({origin : APP_URL}));
app.use(
    express.json({
        verify: (req , _res, buf) =>{
            req.rawBody = buf;
        },
    }),
);

app.get("/health",(_req, res)=>{
    res.json({ ok : true })
});

app.post("signup" , async (req , res)=>{
    const { email , password } = parse(credential, req.body, "body");
    const user = await prisma.user.create({
        data: {email , passwordHash :  await Bun.password.hash(password)},
        select : { id : true , email : true},
    });
    res.status(201).json({ token : signToken(user.id), user});
    
});

