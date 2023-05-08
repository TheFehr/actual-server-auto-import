FROM node:16-bullseye as base

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y git
WORKDIR /app/auto-importer

ADD yarn.lock package.json ./

RUN yarn install --production


FROM jlongster/actual-server

RUN mkdir /app/auto-importer
COPY . /app/auto-importer

COPY --from=base /app/auto-importer/node_modules /app/auto-importer/node_modules
RUN awk '/await syncApp.init\(\)/{print;print "  await require(\x27./auto-importer/importer\x27)();";next}1' app.js > new_app.js

CMD [ "node", "new_app.js" ]