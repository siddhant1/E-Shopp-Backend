const mutations = {
  createItem(parent, { data }, { db }, info) {
    //TODO : Check if they are logged in
    return db.mutation.createItem(
      {
        data
      },
      info
    );
  }
};

module.exports = mutations;
