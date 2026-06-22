import { GoogleGenAI } from '@google/genai'
import env from '../../config/env.js';
import generateContentConfig from './config-generate.js';
import updateContentConfig from './config-update.js';

class AiUtility {
  #ai;
  constructor() {
    this.#ai = new GoogleGenAI({
      vertexai: true,
      project: env.gcpProjectId,
      location: 'global',
    })
  }

  async aiTranslate(prompt, mlProxy, prevQuery) {
    const aiPromise = this.#getAiQueries(prompt, prevQuery).catch((err) => {
      err.message = `call to Vertex AI failed - ${err.message}`;
      throw err;
    });
    const advancedSearchConfigPromise = mlProxy.advancedSearchConfig(env.unitName).catch((err) => {
      err.message = `Fetching advanced search config failed - ${err.message}`;
      throw err;
    });
    const [aiResponse, advancedSearchConfig] = await Promise.all([
      aiPromise,
      advancedSearchConfigPromise,
    ]);
    const advancedSearchConfigTerms = advancedSearchConfig.terms;

    const aiResponseObj = JSON.parse(aiResponse.text);
    //expecting { options: []} , but may receive just the array
    const protoQueries = Array.isArray(aiResponseObj)
      ? aiResponseObj
      : aiResponseObj.options;
    //TODO: in future we will want to return more than one option, but for now, we only want the first one.
    // protoQueries.splice(1);
    const queries = this.#processProtoQueries(protoQueries, advancedSearchConfigTerms);
    // TODO: in future we will return an array of queries, but for now we will just return the first one.
    // return queries;
    return queries;
  }

  async #getAiQueries(prompt, prevQuery) {
    const response = await this.#ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
      role: "user",
      parts: [
        {
        text: prevQuery ? `Query: ${prevQuery}\n\nImprovement: ${prompt}` : prompt,
        },
      ],
      },
      config: prevQuery ? updateContentConfig : generateContentConfig,
    });
    return response;
  }

  #processProtoQueries(protoQueries, advancedSearchConfigTerms) {
    const queries = protoQueries.map((protoQuery) => {
      const query = this.#addScopeToQuery(
        this.#convertProtoQueryToQuery(
          protoQuery.query,
          protoQuery.scope,
          advancedSearchConfigTerms,
        ),
        protoQuery.scope,
      )
      return {
        query: query,
        parsed: protoQuery.parsed,
        natural: protoQuery.natural,
      }
    });
    return queries;
  }

  #addScopeToQuery(query, scope) {
    return { _scope: scope, ...query };
  }

  #convertProtoQueryToQuery(protoQuery, scope, advancedSearchConfigTerms) {
    const query = {};
    if (protoQuery.hasOwnProperty("p")) {
      query[protoQuery.f] = protoQuery.p.map((subQuery) =>
        this.#convertProtoQueryToQuery(subQuery, scope, advancedSearchConfigTerms),
      );
    } else if (protoQuery.hasOwnProperty("r")) {
        const newScope = advancedSearchConfigTerms[scope][protoQuery.f].relation;
        query[protoQuery.f] = this.#convertProtoQueryToQuery(
          protoQuery.r,
          newScope,
          advancedSearchConfigTerms,
        );
    } else {
      // TODO: handle "d" for booleans and inserting ids dynamically, using RAG, tool calling or some other solution
      // if (protoQuery.hasOwnProperty("d") && protoQuery.d) {
      //   const ids = ["breaks"];
      //   query["OR"] = ids.map((id) => ({ id: id }));
      //   return query;
      // }
      if (protoQuery.hasOwnProperty("f")) {
        const relation = advancedSearchConfigTerms[scope][protoQuery.f].relation;
        switch (relation) {
          case "float":
            // LUX passes floats as strings, this differs from the lux-ai-query-builder which parses it as a float
            query[protoQuery.f] = protoQuery.v.toString();
            break;
          case "boolean":
            query[protoQuery.f] = parseInt(protoQuery.v);
            break;
          default:
            query[protoQuery.f] = protoQuery.v;
        }
      }
      if (protoQuery.hasOwnProperty("c")) {
        query["_comp"] = protoQuery.c;
      }
    }
    return query;
  }

}

export default AiUtility
