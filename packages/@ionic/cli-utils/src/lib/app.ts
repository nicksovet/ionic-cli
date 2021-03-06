import chalk from 'chalk';

import { App, AppAssociation, IClient, IPaginator, PaginateArgs, PaginatorState, ResourceClientCreate, ResourceClientLoad, ResourceClientPaginate, Response } from '../definitions';
import { isAppAssociationResponse, isAppResponse, isAppsResponse } from '../guards';
import { ResourceClient, createFatalAPIFormat } from './http';

export function formatName(app: Pick<App, 'name' | 'org'>) {
  if (app.org) {
    return `${chalk.dim(`${app.org.name} / `)}${app.name}`;
  }

  return app.name;
}

export interface AppClientDeps {
  readonly client: IClient;
  readonly token: string;
}

export interface AppCreateDetails {
  name: string;
}

export class AppClient extends ResourceClient implements ResourceClientLoad<App>, ResourceClientCreate<App, AppCreateDetails>, ResourceClientPaginate<App> {
  protected client: IClient;
  protected token: string;

  constructor({ client, token }: AppClientDeps) {
    super();
    this.client = client;
    this.token = token;
  }

  async load(id: string): Promise<App> {
    const { req } = await this.client.make('GET', `/apps/${id}`);
    this.applyAuthentication(req, this.token);
    const res = await this.client.do(req);

    if (!isAppResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async create({ name }: AppCreateDetails): Promise<App> {
    const { req } = await this.client.make('POST', '/apps');
    this.applyAuthentication(req, this.token);
    req.send({ name });
    const res = await this.client.do(req);

    if (!isAppResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  paginate(args: Partial<PaginateArgs<Response<App[]>>> = {}): IPaginator<Response<App[]>, PaginatorState> {
    return this.client.paginate({
      reqgen: async () => {
        const { req } = await this.client.make('GET', '/apps');
        this.applyAuthentication(req, this.token);
        return { req };
      },
      guard: isAppsResponse,
      ...args,
    });
  }

  async createGithubAssociation(id: string, association: { repoId: string; }): Promise<AppAssociation> {
    const { req } = await this.client.make('POST', `/apps/${id}/github`);

    req
      .set('Authorization', `Bearer ${this.token}`)
      .send({ repository_id: association.repoId });

    const res = await this.client.do(req);

    if (!isAppAssociationResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async deleteGithubAssociation(id: string): Promise<void> {
    const { req } = await this.client.make('DELETE', `/apps/${id}/github`);

    req
      .set('Authorization', `Bearer ${this.token}`)
      .send({});

    await req;
  }
}
