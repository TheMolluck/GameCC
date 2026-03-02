FROM node:20-alpine AS base-env
WORKDIR /app
COPY ./package.json pnpm-lock.yaml /app/
RUN apk add --no-cache git
RUN corepack enable
RUN corepack prepare

FROM base-env AS development-dependencies-env
COPY ./package.json pnpm-lock.yaml /app/
WORKDIR /app
RUN pnpm i --frozen-lockfile --ignore-scripts

FROM base-env AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN pnpm i --frozen-lockfile --prod --ignore-scripts

FROM base-env  AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN pnpm run build

FROM base-env
COPY ./package.json package-lock.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
WORKDIR /app
CMD ["pnpm", "run", "start"]