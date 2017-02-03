import {Directive, Input, HostBinding, EventEmitter, Output, AfterContentInit, ContentChild, Renderer, ElementRef, HostListener, QueryList, ContentChildren, forwardRef} from '@angular/core';
import {SuiTransition, TransitionController, Transition} from '../transition/transition';

export class NewDropdownService {
    public isOpen:boolean;
    public isOpenChange:EventEmitter<boolean>;

    public isDisabled:boolean;

    public children:NewDropdownService[];
    public isNested:boolean;

    constructor() {
        this.isOpen = false;
        this.isOpenChange = new EventEmitter<boolean>();

        this.isDisabled = false;

        this.children = [];
        this.isNested = false;
    }

    public setOpenState(isOpen:boolean) {
        if (this.isOpen != isOpen && !this.isDisabled) {
            this.isOpen = !!isOpen;
            this.delay(() => this.isOpenChange.emit(this.isOpen));

            if (!this.isOpen) {
                this.children.forEach(c => c.setOpenState(this.isOpen));
            }
        }
        else if (this.isOpen != isOpen && this.isDisabled) {
            this.delay(() => this.isOpenChange.emit(this.isOpen));
        }
    }

    public setDisabledState(isDisabled:boolean) {
        if (this.isDisabled != isDisabled) {
            if (!!isDisabled) {
                // Close the dropdown as it is now disabled
                this.setOpenState(false);
            }

            this.isDisabled = !!isDisabled;
        }
    }

    public toggleOpenState() {
        this.setOpenState(!this.isOpen);
    }

    public registerChild(child:NewDropdownService) {
        if (!this.isChildRegistered(child)) {
            this.children.push(child);
            child.isNested = true;
        }
    }

    public isChildRegistered(child:NewDropdownService):boolean {
        return this.children
            .map(c => (c == child || child.children
                .map(c => c.isChildRegistered(child))
                .reduce((a, b) => a || b, false)))
            .reduce((a, b) => a || b, false);
    }

    public clearChildren() {
        this.children.forEach(c => c.isNested = false);
        this.children = [];
    }

    private delay(callback:() => any) {
        setTimeout(() => callback());
    }
}

@Directive({
    selector: '[newSuiDropdownMenu]'
})
export class NewSuiDropdownMenu extends SuiTransition {
    private _service:NewDropdownService;
    private _transitionController:TransitionController;

    public set service(value:NewDropdownService) {
        this._service = value;

        let previousIsOpen = this._service.isOpen;
        this._service.isOpenChange.subscribe(isOpen => {
            if (isOpen != previousIsOpen) {
                this._transitionController.stopAll();
                this._transitionController.animate(new Transition("slide down", 200));
            }
            previousIsOpen = isOpen;
        });
    }

    constructor(public renderer:Renderer, public element:ElementRef) {
        super(renderer, element);

        this._transitionController = new TransitionController(false);
        this.setTransitionController(this._transitionController);       
    }

    @HostListener("click", ['$event'])
    public onClick(e:MouseEvent) {
        e.stopPropagation();

        // We have selected a dropdown item
        console.log("clicked item");
    }
}

@Directive({
    selector: '[newSuiDropdown]'
})
export class NewSuiDropdown implements AfterContentInit {
    public service:NewDropdownService;

    @ContentChild(NewSuiDropdownMenu)
    private _menu:NewSuiDropdownMenu;


    @ContentChildren(forwardRef(() => NewSuiDropdown), { descendants: true })
    private _children:QueryList<NewSuiDropdown>;

    public get children() {
        return this._children.filter(c => c !== this);
    }

    @Output()
    public get isOpenChange() {
        return this.service.isOpenChange;
    }

    @HostBinding('class.active')
    public get isActive() {
        return this.service.isOpen && !this.service.isNested;
    }

    @Input()
    public get isOpen() {
        return this.service.isOpen;
    }

    public set isOpen(value:boolean) {
        this.service.setOpenState(value);
    }

    @HostBinding('class.disabled')
    @Input()
    public get isDisabled() {
        return this.service.isDisabled;
    }

    public set isDisabled(value:boolean) {
        this.service.setDisabledState(value);
    }

    constructor() {
        this.service = new NewDropdownService();
    }

    public ngAfterContentInit() {
        if (!this._menu) {
            throw new Error("You must set [suiDropdownMenu] on the menu element.");
        }
        this._menu.service = this.service;

        this.childrenUpdated();
        this._children.changes
            .subscribe(() => this.childrenUpdated());
    }

    private childrenUpdated() {
        this.children
            .map(c => c.service)
            .forEach(s => this.service.registerChild(s))
    }

    @HostListener("click", ['$event'])
    public onClick(e:MouseEvent) {
        e.stopPropagation();

        this.service.toggleOpenState();
    }
}