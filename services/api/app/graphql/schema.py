"""The public GraphQL schema (queries, mutations, subscriptions)."""

import strawberry

from app.graphql.mutation import Mutation
from app.graphql.query import Query
from app.graphql.subscription import Subscription

schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)
