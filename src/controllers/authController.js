import * as authService from "../services/authService.js";

export const register = async (req, res) => {
    const user = await authService.register(req.valid.body);
    res.status(201).json(user);
};

export const login = async (req, res) => {
    const result = await authService.login(req.valid.body);
    res.json(result);
};

export const refresh = async (req, res) => {
    const result = await authService.refresh(req.valid.body);
    res.json(result);
};

export const logout = async (req, res) => {
    await authService.logout(req.valid.body);
    res.status(204).end();
};
