import YAML from "yaml";

// A utility tool which allows modifiying yaml, while keeping comments at the beginning of the file
export default class Yaml {
    public yaml: unknown;
    #startingComments: string = "";
    
    constructor(yaml: string) {
        this.yaml = YAML.parse(yaml);
        this.#startingComments = yaml.match(/^\s*#.*\n/gm)?.join("") ?? "";
    }

    toString(): string {
        return this.#startingComments + "\n" + YAML.stringify(this.yaml);
    }

    static parse(yaml: string): Yaml {
        return new Yaml(yaml);
    }

    static stringify(yaml: Yaml | unknown): string {
        return yaml instanceof Yaml ? yaml.toString() : YAML.stringify(yaml);
    }
}
