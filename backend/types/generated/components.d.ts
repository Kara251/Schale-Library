import type { Schema, Struct } from '@strapi/strapi';

export interface ResearchPathStep extends Struct.ComponentSchema {
  collectionName: 'components_research_path_steps';
  info: {
    displayName: '\u8DEF\u5F84\u6B65\u9AA4';
    icon: 'arrow-right';
  };
  attributes: {
    entry: Schema.Attribute.Relation<
      'oneToOne',
      'api::research-entry.research-entry'
    >;
    step_note: Schema.Attribute.String;
  };
}

export interface ResearchRelatedLink extends Struct.ComponentSchema {
  collectionName: 'components_research_related_links';
  info: {
    displayName: '\u5EF6\u4F38\u9605\u8BFB\u94FE\u63A5';
    icon: 'link';
  };
  attributes: {
    curate_note: Schema.Attribute.String;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    relation_type: Schema.Attribute.Enumeration<
      [
        'related',
        'prototype',
        'echoes',
        'extends',
        'contradicts',
        'prerequisite',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'related'>;
    target_entry: Schema.Attribute.Relation<
      'oneToOne',
      'api::research-entry.research-entry'
    >;
  };
}

export interface ResearchRevision extends Struct.ComponentSchema {
  collectionName: 'components_research_revisions';
  info: {
    displayName: '\u4FEE\u8BA2\u8BB0\u5F55';
    icon: 'history';
  };
  attributes: {
    date: Schema.Attribute.Date & Schema.Attribute.Required;
    note: Schema.Attribute.String;
    revision_type: Schema.Attribute.Enumeration<
      ['created', 'updated', 'confirmed', 'refuted']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'updated'>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'research.path-step': ResearchPathStep;
      'research.related-link': ResearchRelatedLink;
      'research.revision': ResearchRevision;
    }
  }
}
