FROM jlongster/actual-server

RUN mkdir /app/auto-importer
COPY . /app/auto-importer

RUN yarn install --cwd /app/auto-importer

CMD ["/app/auto-importer/entry.sh"]