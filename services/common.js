const BaseService = require(".")
const {signRefreshToken, signLoginToken, verifyRefreshToken} = require("../common/jwt");
const UserModel = require("../models/User")
const {verifyHash} = require("../common/hash");
class CommonService extends BaseService {

    _getTokens(userId) {
        const signedToken = signLoginToken(userId);
        const refreshToken = signRefreshToken(userId);
        return {
            jwt: signedToken,
            jwtRefresh: refreshToken,
        };
    }

    async _setTokens(userId) {
        const tokens = this._getTokens(userId);

        await UserModel.findByIdAndUpdate(userId, {other_info: tokens}, {new: true})

        return this._getTokens(userId);
    }

    async login() {

        let user;

        if(this.reqBody.email){
            user = await UserModel.findOne({ email: this.reqBody.email, deleted_at: null })
        }else{
            user = await UserModel.findOne({ contact: this.reqBody.contact, deleted_at: null })
        }

        if (!user) {
            throw new Error('User not found.');
        }

        const isMatch = await verifyHash(this.reqBody.password, user.password)

        if (!isMatch) {
            throw new Error("Password you had enter was incorrect.")
        }

        return this._setTokens(user.id)
    }

    async logout() {
        await UserModel.findByIdAndUpdate(this.reqBody.id, {other_info: {}}, {new: true})
    }

    async refreshToken(req) {
        const decoded = await verifyRefreshToken(this.reqBody.refreshToken);

        return this._setTokens(decoded.id);
    }
}

module.exports = CommonService