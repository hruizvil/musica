# CapoeiraMusicaLibrary

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Deploying

Production is **Vercel**, at https://abada-musica.vercel.app, built from `main`.

**Pushing to `main` deploys to production.** There is no separate release step and no
`--base-href` to remember — Vercel builds from source and serves at the domain root, so
the `<base href="/">` in `src/index.html` is already correct.

Vercel is also the only host that can serve `api/` (the Stripe checkout, billing portal
and webhook functions). Any host without serverless functions breaks membership.

### Retired: GitHub Pages

The `gh-pages` branch previously served a copy at `hruizvil.github.io/musica/`. It is no
longer deployed to: it cannot run `api/`, so membership was dead there, and it needed a
`--base-href=/musica/` build that silently shipped a blank page whenever it was
forgotten. `vercel.json` tells Vercel to ignore that branch — pushing compiled output to
it used to trigger a build that always failed, since the branch has no `package.json`.

`angular-cli-ghpages` is invoked via `npx` (not a project dependency) and publishes the
build output to the `gh-pages` branch, which GitHub Pages serves as-is.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
