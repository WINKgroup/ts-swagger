export interface User {
    // swagger
    name: string;
    surname: string;
    age?: number;
    prova: boolean;
}
enum Prova {
    PROVA = "prova",
    CIAO = "ciao"
}
export interface Animal {
    // swagger
    name: string;
}


import * as express from "express";

export const register = (app: express.Application) => {

    app.get('/api/users', (req: any, res: any) => {
        // schema: User
        // description: Get all users
        // response_description: Array of User
        try {

        } catch (err) {
            console.error(err);
        }
    });

    app.get('/api/users/:userId', function (req: any, res: any) {
        // schema: User
        // description: Get user by id
        try {

        } catch (err) {
            console.error(err);
        }
    });

    app.post('/api/user', async (req: any, res: any) => {
        // schema: User
        // description: Post new user
        try {

        } catch (err) {
            console.error(err);
        }
    });

    app.put('/api/users/:userId', async (req: any, res: any) => {
        // schema: User
        // description: Modify user data by id
        try {

        } catch (err) {
            console.error(err);
        }
    });

    app.delete('/api/users/:userId', async (req: any, res: any) => {
        // schema: User
        // description: Delete user by id
        try {

        } catch (err) {
            console.error(err);
        }
    });


    /* --------------------------------------------------------------- */

    app.get('/api/animals', async (req: any, res: any) => {
        // schema: Animal
        // description: Get all animals
        // response_description: Array of Animal
    });

    app.get('/api/animals/:id', function (req: any, res: any) {
        // schema: Animal
        // description: Get animal by id
    });

    app.post('/api/animals', async (req: any, res: any) => {
        // schema: Animal
        // description: Post new animal
    });

    app.put('/api/animals/:id', async (req: any, res: any) => {
        // schema: Animal
        // description: Modify animal data by id
    });

    app.delete('/api/animals/:id', async (req: any, res: any) => {
        // schema: Animal
        // description: Delete animal by id
    });
};