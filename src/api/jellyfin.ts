import { Jellyfin } from '@jellyfin/sdk';
import { Api } from '@jellyfin/sdk/lib/api';
import { getUserApi as getUserApiBase } from '@jellyfin/sdk/lib/utils/api/user-api';
import { getLibraryApi as getLibraryApiBase } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getItemsApi as getItemsApiBase } from '@jellyfin/sdk/lib/utils/api/items-api';
import { getUserViewsApi as getUserViewsApiBase } from '@jellyfin/sdk/lib/utils/api/user-views-api';
import { getUserLibraryApi as getUserLibraryApiBase } from '@jellyfin/sdk/lib/utils/api/user-library-api';
import { getImageApi as getImageApiBase } from '@jellyfin/sdk/lib/utils/api/image-api';
import { getSessionApi as getSessionApiBase } from '@jellyfin/sdk/lib/utils/api/session-api';
import { getDisplayPreferencesApi as getDisplayPreferencesApiBase } from '@jellyfin/sdk/lib/utils/api/display-preferences-api';
import { getPlaystateApi as getPlaystateApiBase } from '@jellyfin/sdk/lib/utils/api/playstate-api';
import { getMediaInfoApi as getMediaInfoApiBase } from '@jellyfin/sdk/lib/utils/api/media-info-api';
import { getArtistsApi as getArtistsApiBase } from '@jellyfin/sdk/lib/utils/api/artists-api';
import { getTvShowsApi as getTvShowsApiBase } from '@jellyfin/sdk/lib/utils/api/tv-shows-api';
import { getMoviesApi as getMoviesApiBase } from '@jellyfin/sdk/lib/utils/api/movies-api';

export const createJellyfinInstance = (deviceId: string) => {
    return new Jellyfin({
        clientInfo: {
            name: 'CinTV',
            version: '1.0.0'
        },
        deviceInfo: {
            name: 'Android TV',
            id: deviceId
        }
    });
};

export const createApiClient = (jellyfin: Jellyfin, serverUrl: string, accessToken?: string) => {
    return jellyfin.createApi(serverUrl, accessToken);
};

export const getUserApi = (api: Api) => getUserApiBase(api);
export const getLibraryApi = (api: Api) => getLibraryApiBase(api);
export const getItemsApi = (api: Api) => getItemsApiBase(api);
export const getUserViewsApi = (api: Api) => getUserViewsApiBase(api);
export const getUserLibraryApi = (api: Api) => getUserLibraryApiBase(api);
export const getImageApi = (api: Api) => getImageApiBase(api);
export const getSessionApi = (api: Api) => getSessionApiBase(api);
export const getDisplayPreferencesApi = (api: Api) => getDisplayPreferencesApiBase(api);
export const getPlaystateApi = (api: Api) => getPlaystateApiBase(api);
export const getMediaInfoApi = (api: Api) => getMediaInfoApiBase(api);
export const getArtistsApi = (api: Api) => getArtistsApiBase(api);
export const getTvShowsApi = (api: Api) => getTvShowsApiBase(api);
export const getMoviesApi = (api: Api) => getMoviesApiBase(api);
