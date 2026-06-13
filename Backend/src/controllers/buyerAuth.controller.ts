import { Request, Response } from "express";

export async function sendOtp(_req: Request, _res: Response): Promise<void> {}

export async function verifyOtp(_req: Request, _res: Response): Promise<void> {}

export async function googleRedirect(_req: Request, _res: Response): Promise<void> {}

export async function googleCallback(_req: Request, _res: Response): Promise<void> {}

export async function googleOneTap(_req: Request, _res: Response): Promise<void> {}

export async function refresh(_req: Request, _res: Response): Promise<void> {}

export async function logout(_req: Request, _res: Response): Promise<void> {}

export async function me(_req: Request, _res: Response): Promise<void> {}
