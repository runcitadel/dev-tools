import { exec as execCallback } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execCallback);

export type ContainerV3 = {
  name: string
  image: string
  /**
   * Ports this container requires to be exposed to work properly
   */
  requiredPorts?: number[]
  /**
   * If this is the main container, the port inside the container which will be exposed to the outside as the port specified in metadata. If this is not set, the port is passed as an env variable in the format APP_${APP_NAME}_${CONTAINER_NAME}_PORT
   */
  port?: number
  /**
   * The port this container would like to have "port" exposed as.
   */
  preferredOutsidePort?: number
  /**
   * Set this to true if the app requires the preferredOutsidePort to be the real outside port.
   */
  requiresPort?: boolean
  environment?: Record<string, unknown>
  /**
   * An array of at directories in the container the app stores its data in. Can be empty. Please only list top-level directories.
   */
  data?: string[]
  /**
   * The user the container should run as
   */
  user?: string
  /**
   * The grace period for stopping the container. Defaults to 1 minute.
   */
  stop_grace_period?: string
  /**
   * The services the container depends on
   */
  depends_on?: unknown[]
  /**
   * The entrypoint for the container
   */
  entrypoint?: string | unknown[]
  /**
   * Where to mount some services' data directories
   */
  mounts?: {
    /**
     * Where to mount the bitcoin dir
     */
    bitcoin?: string
    /**
     * Where to mount the lnd dir
     */
    lnd?: string
    /**
     * Where to mount the c-lightning dir
     */
    c_lightning?: string
  }
  /**
   * The command for the container
   */
  command?: string | unknown[]
  /**
   * Whether the container should be run with init
   */
  init?: boolean
  /**
   * The signal to send to the container when stopping
   */
  stop_signal?: string
  /**
   * Set this to true if the container shouldn't get an IP & port exposed. This isn't necessary, but helps the docker-compose.yml generator to generate a cleaner output.
   */
  noNetwork?: boolean
  /**
   * This can either be a map of hidden service names (human readable names, not the .onion URL, and strings, not numbers) to a port if your app needs multiple hidden services on different ports, a map of port inside to port on the hidden service (if your app has multiple ports on one hidden service), or simply one port number if your apps hidden service should only expose one port to the outside which isn't 80.
   */
  hiddenServicePorts?:
    | {
        [k: string]: unknown
      }
    | number
    | (string | number | unknown[])[]
  /**
   * When the container should restart. Can be 'always' or 'on-failure'.
   */
  restart?: string
  /**
   * Dependencies this container requires, it is ignored without it.
   */
  requires?: string[]
  network_mode?: string
};

export type Container = {
  name?: string;
  image?: string;
  permissions?: ("lnd" | "bitcoind" | "electrum" | "root" | "hw")[];
  ports?: (string | number)[];
  /**
   * If this is the main container, the port inside the container which will be exposed to the outside as the port specified in metadata.
   */
  port?: number;
  environment?:
    | {
        [k: string]: unknown;
      }
    | unknown[];
  /**
   * An array of at directories in the container the app stores its data in. Can be empty. Please only list top-level directories.
   */
  data?: string[];
  /**
   * The user the container should run as
   */
  user?: string;
  /**
   * The grace period for stopping the container. Defaults to 1 minute.
   */
  stop_grace_period?: string;
  /**
   * The services the container depends on
   */
  depends_on?: unknown[];
  /**
   * The entrypoint for the container
   */
  entrypoint?: string | unknown[];
  /**
   * The command for the container
   */
  command?: string | unknown[];
  /**
   * Whether the container should be run with init
   */
  init?: boolean;
  /**
   * The signal to send to the container when stopping
   */
  stop_signal?: string;
  /**
   * Set this to true if the container shouldn't get an IP & port exposed.
   */
  noNetwork?: boolean;
  /**
   * Set this to true if the container should be assigned a hidden service even if it's not the main container.
   */
  needsHiddenService?: boolean;
  /**
   * Set this to a port if your container exposes multiple ports, but only one should be a hidden service.
   */
  hiddenServicePort?: number;
  /**
   * Set this to a map of service names to hidden service ports if your container exposes multiple ports, and all of them should be hidden services.
   */
  hiddenServicePorts?: {
    /**
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` "^[a-zA-Z0-9_]+$".
     */
    [k: string]: number | unknown[];
  };
};

/**
 * An app.yml, version 1
 */
export interface AppYmlV1 {
  /**
   * The version of the app.yml format you're using.
   */
  version?: string | number;
  metadata: {
    /**
     * Displayed name of the app
     */
    name: string;
    /**
     * Displayed version for the app
     */
    version: string;
    /**
     * The category you'd put the app in
     */
    category: string;
    /**
     * A clever tagline
     */
    tagline: string;
    /**
     * A longer description of the app
     */
    description: string;
    /**
     * The awesome people behind the app
     */
    developer: string;
    /**
     * Displayed version for the app
     */
    website: string;
    /**
     * The services the app depends on
     */
    dependencies?: string[];
    /**
     * The development repository for your app
     */
    repo: string;
    /**
     * A link to the app support wiki/chat/...
     */
    support: string;
    /**
     * URLs or paths in the runcitadel/app-images/[app-name] folder with app images
     */
    gallery: string[];
    /**
     * The path of the app's visible site the open button should open
     */
    path?: string;
    /**
     * The app's default password
     */
    defaultPassword?: string;
    /**
     * Whether the app is only available over tor
     */
    torOnly?: boolean;
    /**
     * The name of the main container for the app. If set, IP, port, and hidden service will be assigned to it automatically.
     */
    mainContainer?: string;
    /**
     * The container the developer system should automatically update.
     */
    updateContainer?: string;
  };
  containers: Container[];
}

export interface AppYmlV2 {
  /**
   * The version of the app.yml format you're using.
   */
  version?: string | number;
  metadata: {
    /**
     * Displayed name of the app
     */
    name: string;
    /**
     * Displayed version for the app
     */
    version: string;
    /**
     * The category you'd put the app in
     */
    category: string;
    /**
     * A clever tagline
     */
    tagline: string;
    /**
     * A longer description of the app
     */
    description: string;
    /**
     * The awesome people behind the app
     */
    developer: string;
    /**
     * Displayed version for the app
     */
    website: string;
    /**
     * The services the app depends on
     */
    dependencies?: string[];
    /**
     * The development repository for your app
     */
    repo: string;
    /**
     * A link to the app support wiki/chat/...
     */
    support: string;
    /**
     * URLs or paths in the runcitadel/app-images/[app-name] folder with app images
     */
    gallery: string[];
    /**
     * The path of the app's visible site the open button should open
     */
    path?: string;
    /**
     * The app's default password
     */
    defaultPassword?: string;
    /**
     * Whether the app is only available over tor
     */
    torOnly?: boolean;
    /**
     * The container the developer system should automatically update.
     */
    updateContainer?: string | string[];
  };
  containers: Container[];
}

/**
 * The third revision of Citadel's app.yml format
 */
 export interface AppYmlV3 {
  /**
   * The version of the app.yml format you're using.
   */
  version?: string | number
  metadata: {
    /**
     * Displayed name of the app
     */
    name: string
    /**
     * Displayed version for the app
     */
    version: string
    /**
     * The category you'd put the app in
     */
    category: string
    /**
     * A clever tagline
     */
    tagline: string
    /**
     * A longer description of the app
     */
    description: string
    /**
     * The awesome people behind the app
     */
    developers: Record<string, string>
    /**
     * The services the app depends on. This can also contain an array like [c-lightning, lnd] if your app requires one of two dependencies to function.
     */
    dependencies?: (string | string[])[]
    /**
     * The development repository (or repositories) for your app, if you have multiple, in the format human readable name: repo url
     */
    repo:
      | string
      | Record<string, string>
    /**
     * A link to the app support wiki/chat/...
     */
    support: string
    /**
     * URLs or paths in the runcitadel/app-images/[app-name] folder with app images
     */
    gallery: string[]
    /**
     * The path of the app's visible site the open button should open
     */
    path?: string
    /**
     * The app's default password. Set this to $APP_SEED if the password is the environment variable $APP_SEED.
     */
    defaultPassword?: string
    /**
     * Whether the app is only available over tor
     */
    torOnly?: boolean
    /**
     * The container(s) the automatic update system should automatically update.
     */
    updateContainer?: string | unknown[]
  }
  containers: ContainerV3[];
}

// For a given app, get the main container
// If an app has only one container, it's the main container
// If an app has multiple containers, the main container is the one whose name matches the mainContainer property if it's set,
// or the name is "main" if mainContainer isn't set
export function getMainContainer(app: AppYmlV1 | AppYmlV2 | AppYmlV3): Container | ContainerV3 {
  // @ts-expect-error
  const mainContainerName = app.metadata?.mainContainer || "main";
  return (
    // @ts-expect-error
    app.containers.find((container: Container | ContainerV3) => container.name === mainContainerName) ||
    // @ts-expect-error
    app.containers.find((container: Container | ContainerV3) => container.name === "web") ||
    app.containers[0]
  );
}

export function getUpdateContainers(app: AppYmlV1 | AppYmlV2 | AppYmlV3): (Container | ContainerV3)[] {
  if (!app.metadata.updateContainer) return [getMainContainer(app)];
  else if (typeof app.metadata.updateContainer === "string")
    return [
      // @ts-expect-error
      app.containers.find(
        // @ts-expect-error
        (container) => container.name === app.metadata.updateContainer
      ) as Container,
    ];
  else
    return app.metadata.updateContainer.map(
      (containerName) =>
      // @ts-expect-error
        app.containers.find(
          // @ts-expect-error
          (container) => container.name === containerName
        ) as Container
    );
}

// For a given container, update it to a given version
// This happens by getting the container's image and then pulling it using "docker pull"
// The container's image is the value of container.image, before the colon
// The containers image is then updated to the new image and the new container is returned
export async function updateContainer(
  container: Container | ContainerV3,
  version: string
): Promise<Container | ContainerV3> {
  if (!container.image) throw new Error("Container has no image");
  const image = container.image.split(":")[0];
  let newImage = `${image}:${version}`;
  const newContainer = { ...container, image: newImage };
  try {
    await exec(`docker pull ${newImage}`);
  } catch {
    newImage = `${image}:v${version}`;
    await exec(`docker pull ${newImage}`);
  }
  const inspected = await exec(`docker image inspect ${newImage}`);
  const digest: string = JSON.parse(inspected.stdout)[0].RepoDigests[0];
  newContainer.image = `${newImage}@${digest.split("@")[1]}`;
  return newContainer;
}
